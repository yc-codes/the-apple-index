// Thin client for apple.com: polite, prioritised request queue, throttle circuit breaker, bootstrap extraction.
import { AsyncLocalStorage } from 'node:async_hooks';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
// Apple's bot protection answers 541 when a client moves too fast, so requests go out one at a time:
// ~1.5s apart while a visitor is waiting, ~8s apart for background refreshes (a full price refresh of the
// catalog is ~1,100 requests, so it completes in about 2.5 hours, well inside the 6-hour refresh cycle).
// Observed: Apple starts answering 541 after roughly 60–70 back-to-back requests from one IP.
export const politeness = {
  interactiveGapMs: Number(process.env.APPLE_INTERACTIVE_GAP_MS) || 1500,
  backgroundGapMs: Number(process.env.APPLE_BACKGROUND_GAP_MS) || 8000,
  cooldownMs: 15 * 60e3,
  maxCooldownMs: 2 * 3600e3,
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const priority = new AsyncLocalStorage();
// Work started inside `interactive()` (a visitor waiting on a page) runs first, and background refreshes
// pause entirely until no visitor is waiting.
let foreground = 0;
const idle = [];
export async function interactive(fn) {
  foreground++;
  try {
    return await priority.run(true, fn);
  } finally {
    if (--foreground === 0) idle.splice(0).forEach((resume) => resume());
  }
}
let busy = false,
  lastStart = 0;
const queue = [];
async function slot(task) {
  const high = priority.getStore() === true;
  for (;;) {
    if (!high) while (foreground > 0) await new Promise((resume) => idle.push(resume));
    if (!busy) break;
    await new Promise((resolve) => {
      const waiter = { resolve, high };
      high ? queue.splice(queue.findIndex((w) => !w.high) >>> 0, 0, waiter) : queue.push(waiter);
    });
    if (!busy && (high || foreground === 0)) break;
  }
  busy = true;
  // Node's fetch can leave no referenced handle mid-request; keep the process alive until it settles.
  const keepAlive = setInterval(() => {}, 1e9);
  try {
    const wait =
      lastStart + (high ? politeness.interactiveGapMs : politeness.backgroundGapMs) - Date.now();
    if (wait > 0) await sleep(wait);
    lastStart = Date.now();
    return await task();
  } finally {
    clearInterval(keepAlive);
    busy = false;
    queue.shift()?.resolve();
  }
}
// Apple answers 541/429/403 when it wants crawlers to back off. Stop all traffic instead of retrying;
// repeated blocks double the pause.
export class AppleThrottled extends Error {
  constructor(until) {
    super(`Apple is rate limiting requests until ${new Date(until).toISOString()}`);
    this.until = until;
  }
}
let blockedUntil = 0,
  cooldown = politeness.cooldownMs;
export const throttleState = () => ({
  blocked: Date.now() < blockedUntil,
  until: blockedUntil ? new Date(blockedUntil).toISOString() : null,
});
function block(status) {
  cooldown =
    Date.now() - blockedUntil < 2 * 3600e3
      ? Math.min(cooldown * 2, politeness.maxCooldownMs)
      : politeness.cooldownMs;
  if (!blockedUntil) cooldown = politeness.cooldownMs;
  blockedUntil = Date.now() + cooldown;
  console.warn(`[apple] ${status}; pausing requests until ${new Date(blockedUntil).toISOString()}`);
  return new AppleThrottled(blockedUntil);
}
export const storeUrl = (store, path) =>
  `https://www.apple.com/${store ? store + '/' : ''}${path.replace(/^\//, '')}`;
export async function appleFetch(url, { retries = 2, fetcher = fetch } = {}) {
  for (let attempt = 0; ; attempt++) {
    if (Date.now() < blockedUntil) throw new AppleThrottled(blockedUntil);
    try {
      const response = await slot(() =>
        Date.now() < blockedUntil
          ? null
          : fetcher(url, {
              headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
              signal: AbortSignal.timeout(25000),
            }),
      );
      if (!response) throw new AppleThrottled(blockedUntil);
      if (response.ok) return response;
      if ([403, 429, 541].includes(response.status)) throw block(response.status);
      const error = new Error(`${response.status} ${url}`);
      error.status = response.status;
      if (response.status < 500 || attempt >= retries) throw error;
    } catch (error) {
      if (
        error instanceof AppleThrottled ||
        (error.status && error.status < 500) ||
        attempt >= retries
      )
        throw error;
    }
    await sleep(1500 * 2 ** attempt);
  }
}
export const appleText = async (url, options) => (await appleFetch(url, options)).text();
export const appleJson = async (url, options) => (await appleFetch(url, options)).json();
// Apple embeds JSON objects inside inline scripts (`productSelectionData: {...}`); read one by brace matching.
export function extractObject(html, marker) {
  const at = html.indexOf(marker);
  if (at < 0) return null;
  const start = html.indexOf('{', at);
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return JSON.parse(html.slice(start, i + 1));
  }
  return null;
}
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
function decodeCodePoint(entity, fallback) {
  const hex = entity[1]?.toLowerCase() === 'x';
  const value = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff
    ? String.fromCodePoint(value)
    : fallback;
}
export function plainText(html) {
  return String(html ?? '')
    .replace(
      /<as-footnote[\s\S]*?<\/as-footnote>|<sup[\s\S]*?<\/sup>|<span class="(visuallyhidden|badge[^"]*)">[\s\S]*?<\/span>/g,
      '',
    )
    .replace(/<br\s*\/?>|<\/?(div|p)\b[^>]*>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#?\w+);/g, (m, e) => entities[e] ?? (e[0] === '#' ? decodeCodePoint(e, m) : m))
    .replace(/[‐‑]/g, '-')
    .replace(/[ \t\u00a0]+/g, ' ')
    .trim();
}
export const basePart = (part) =>
  String(part || '')
    .replace(/[A-Z]{1,3}\/A$/, '')
    .replace(/\/A$/, '');
