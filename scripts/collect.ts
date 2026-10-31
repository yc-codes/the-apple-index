import type { CollectorStatus } from '../server/types';
import { spawnSync } from 'node:child_process';
import { errorMessage } from '../server/json';
// A long-running Bun worker. Never run this inside a Vercel Function.
import { families } from '../server/catalog.ts';
import { catalog, prices, rates, hydrate, publish, peek } from '../server/service.ts';
import { throttleState } from '../server/apple.ts';
import { storage } from '../server/storage.ts';
import { collectAndroid, publishAndroidCatalog } from '../server/android';

const publishOnly = process.argv.includes('--publish-only');
// In Actions, each collected family is pushed to the data branch immediately; browsers read that branch live.
const pushDirectory = process.env.DATA_PUSH_DIR;
let pushed = false;
function push(label: string) {
  if (!pushDirectory) return;
  const git = (...args: string[]) =>
    spawnSync('git', ['-C', pushDirectory, ...args], { encoding: 'utf8' });
  git('add', '-A');
  if (git('diff', '--cached', '--quiet').status === 0) return;
  git('commit', '-m', `Update ${label} ${new Date().toISOString()}`);
  const result = git('push', 'origin', 'HEAD:data');
  if (result.status) console.error('Push failed:', result.stderr);
  else pushed = true;
}
const requested = process.argv.find((arg) => arg.startsWith('--family='))?.split('=')[1];
if (requested && !families.some((f) => f.id === requested))
  throw new Error('Unknown product family');
let failed = 0;
// Independent source: Android collection must not be gated by Apple's cooldown.
// A scoped Apple --family run remains scoped; publishing never requests source pages.
if (!requested) {
  try {
    if (publishOnly) await publishAndroidCatalog(storage);
    else {
      const result = await collectAndroid(storage);
      console.log(`Published ${result.offers} Xiaomi India offers.`);
    }
  } catch (error) {
    failed++;
    console.error('Android collection:', errorMessage(error));
    await publishAndroidCatalog(storage);
  }
  push('Android catalog');
}
const prior = (await storage.read('collector-status')) as CollectorStatus | null;
const appleCooling =
  !publishOnly && !!prior?.blockedUntil && Date.parse(prior.blockedUntil) > Date.now();
if (appleCooling) {
  console.log('Apple cooldown is still active. Keeping the previous prices.');
}
await hydrate();
if (!publishOnly && !appleCooling) {
  try {
    await rates();
  } catch (error) {
    console.error('Exchange rates:', errorMessage(error));
    failed++;
  }
}
// Least recently attempted families first; a block must not starve later families on every run.
const selected = families
  .filter((f) => !appleCooling && (!requested || f.id === requested))
  .sort((a, b) => (prior?.attempts?.[a.id] || 0) - (prior?.attempts?.[b.id] || 0));
const attempts = { ...prior?.attempts };
for (const family of selected) {
  try {
    if (!publishOnly) {
      attempts[family.id] = Date.now();
      await catalog(family.id, { wait: true });
      await prices(family.id, { wait: true });
    }
    if (await publish(family.id)) console.log(`Published ${family.id}`);
    if (!publishOnly && peek(`prices-${family.id}`)?.failed?.length) failed++;
  } catch (error) {
    failed++;
    console.error(`${family.id}:`, errorMessage(error));
    await publish(family.id);
  }
  if (!publishOnly) {
    await storage.write('collector-status', {
      at: new Date().toISOString(),
      attempts,
      blockedUntil: throttleState().until,
      failed,
    });
  }
  push(family.id);
  if (!publishOnly && throttleState().blocked) break;
}
// One rebuild per run refreshes the prerendered pages (and search engines' view of prices).
const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
if (pushed && hook) {
  try {
    const response = await fetch(hook, { method: 'POST', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log('Triggered site rebuild');
  } catch (error) {
    console.error('Rebuild:', errorMessage(error));
  }
}
if (failed) {
  console.error(`${failed} collection steps need retry; last good data was retained.`);
  process.exitCode = 1;
}
