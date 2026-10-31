import type {
  AppleStore,
  Catalog,
  CatalogVariant,
  CollectorSchema,
  FamilyPrices,
  PriceCollection,
} from './types';
import type { Listing, Price, Summary } from '../src/types';
import { mergeListing } from '../src/catalog-data';
import { record } from './json';
// Collector-only service. Persist Apple results before publishing them for the read-only web app.
import { storage } from './storage.ts';
import { createCache } from './cache.ts';
import { createHash } from 'node:crypto';
import { families, familyById, discoverFamily, regionalParts } from './catalog.ts';
import { familyPrices } from './prices.ts';
import { stores, storeByCode } from './stores.ts';
import { storeUrl, AppleThrottled } from './apple.ts';

const HOUR = 3600e3;
export const ttl = { catalog: 24 * HOUR, prices: 6 * HOUR, rates: 6 * HOUR };
const cache = createCache<CollectorSchema>(storage);
export const cached = <K extends keyof CollectorSchema & string>(
  key: K,
  maxAge: number,
  loader: () => Promise<CollectorSchema[K]>,
  _options?: { wait?: boolean },
) => cache.get(key, maxAge, loader);
export const peek = cache.peek;
function requireFamily(id: string) {
  const family = familyById[id];
  if (!family) throw new Error(`Unknown family: ${id}`);
  return family;
}

export const rates = () =>
  cached('rates', ttl.rates, async () => {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Exchange rate request failed');
    const data = record(await response.json());
    if (data.result !== 'success' || typeof data.time_last_update_unix !== 'number')
      throw new Error('Exchange rates unavailable');
    return {
      base: 'USD',
      updated: new Date(data.time_last_update_unix * 1000).toISOString(),
      source: 'https://www.exchangerate-api.com',
      rates: Object.fromEntries(
        Object.entries(record(data.rates)).filter(
          (entry): entry is [string, number] =>
            typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] > 0,
        ),
      ),
    };
  });
export const catalog = (id: string, options?: { wait?: boolean }) =>
  cached(
    `catalog-${id}`,
    ttl.catalog,
    () =>
      discoverFamily(requireFamily(id), {
        pageCache: (url, loader) =>
          cached(`page-${createHash('sha256').update(url).digest('hex')}`, ttl.catalog, loader, {
            wait: true,
          }),
      }),
    options,
  );
// Regional part numbers (e.g. iPhone models per region) rarely change, so they share the catalog lifetime.
const regional = (family: Catalog, store: AppleStore) => () =>
  cached(
    `regional-${family.id}-${store.code}`,
    ttl.catalog,
    () => regionalParts(family, store.store),
    { wait: true },
  );
// A refresh where some stores failed (usually throttling) is retried after 30 minutes instead of 6 hours.
export const prices = async (id: string, options?: { wait?: boolean }) => {
  const key = `prices-${id}` as const;
  await cache.load(key);
  return cached(
    key,
    peek(`prices-${id}`)?.failed?.length ? HOUR / 2 : ttl.prices,
    async () => {
      const family = await catalog(id),
        previous = peek(`prices-${id}`);
      const version = family.discoveredAt;
      // Stores run in sequence (US first) so part numbers learned in one region help the next.
      const candidates = new Map<string, Set<string>>();
      const results: { store: AppleStore; value?: FamilyPrices; at?: string; error?: unknown }[] =
        [];
      for (const store of [storeByCode.us, ...stores.filter((s) => s.code !== 'us')]) {
        try {
          const storeKey = `store-${id}-${store.code}` as const;
          const priorStore = await cache.load(storeKey);
          if (priorStore?.value?.version !== version) cache.invalidate(storeKey);
          const snapshot = await cached(
            storeKey,
            ttl.prices,
            async () => ({
              version,
              at: new Date().toISOString(),
              prices: await familyPrices(family, store, {
                regional: regional(family, store),
                candidates,
              }),
            }),
            { wait: true },
          );
          for (const [variantId, row] of Object.entries(snapshot.prices)) {
            if (!candidates.has(variantId)) candidates.set(variantId, new Set());
            candidates.get(variantId)!.add(row.part);
          }
          results.push({ store, value: snapshot.prices, at: snapshot.at });
        } catch (error) {
          results.push({ store, error });
          if (error instanceof AppleThrottled) break;
        }
      }
      for (const store of stores)
        if (!results.some((r) => r.store === store))
          results.push({ store, error: new AppleThrottled(Date.now()) });
      const byVariant: PriceCollection['byVariant'] = {};
      const failed: string[] = [];
      const add = (variantId: string, row: Price) => (byVariant[variantId] ??= []).push(row);
      for (const { store, value, error, at } of results) {
        if (value) {
          for (const [variantId, price] of Object.entries(value))
            add(variantId, {
              code: store.code,
              local: price.value,
              display: price.display,
              part: price.part,
              at,
            });
          continue;
        }
        // A store that failed this round keeps its last good prices (each row carries its own timestamp).
        failed.push(store.code);
        for (const [variantId, rows] of Object.entries(previous?.byVariant || {}))
          for (const row of rows)
            if (row.code === store.code) add(variantId, { at: previous?.pricedAt, ...row });
      }
      if (results.every((r) => r.error)) throw results[0].error;
      return { pricedAt: new Date().toISOString(), failed, byVariant };
    },
    options,
  );
};

const storeLink = (family: Catalog, variant: CatalogVariant, code: string) =>
  code === 'us' && variant.name
    ? storeUrl('', 'shop/' + family.path + '/' + variant.id)
    : storeUrl(storeByCode[code].store, 'shop/' + family.path);
// The entry configuration (lowest US price, otherwise the first) is the family's default, like Apple's "From" price.
function defaultVariant(family: Catalog, byVariant: PriceCollection['byVariant']) {
  const us = (v: CatalogVariant) =>
    byVariant[v.id]?.find((p) => p.code === 'us')?.local ?? Infinity;
  return (
    [...family.variants].filter((v) => byVariant[v.id]).sort((a, b) => us(a) - us(b))[0] ||
    family.variants[0]
  );
}
// Listing: whatever is ready now; families still loading are flagged as pending.
export function summaries(): Summary[] {
  return families.map((f) => {
    const family = peek(`catalog-${f.id}`),
      priced = peek(`prices-${f.id}`);
    if (!family || !priced) return { id: f.id, name: f.name, category: f.category, ready: false };
    const v = defaultVariant(family, priced.byVariant);
    return {
      id: f.id,
      name: f.name,
      category: f.category,
      ready: true,
      image: v.image || family.image,
      variant: { id: v.id, label: v.label },
      configurations: family.variants.length,
      prices: priced.byVariant[v.id] || [],
      pricedAt: priced.pricedAt,
    };
  });
}
// Load every persisted entry once so the listing can answer immediately after a restart.
let hydrated: Promise<void[]> | null = null;
export const hydrate = () =>
  (hydrated ??= Promise.all(
    families.flatMap((f) =>
      (['catalog-', 'prices-'] as const).map(async (prefix) => {
        await cache.load(`${prefix}${f.id}`);
      }),
    ),
  ));
// Collection runs only in the explicit worker; Vercel request handlers never import this module.
export async function publish(id: string) {
  const family = peek(`catalog-${id}`),
    priced = peek(`prices-${id}`);
  if (!family || !priced) return false;
  // Use already collected values; publishing must not initiate more network work.
  const variants = family.variants.map((v) => ({
    ...v,
    prices: (priced.byVariant[v.id] || []).map((p) => ({
      ...p,
      url: storeLink(family, v, p.code),
    })),
  }));
  await storage.write('product-' + id, {
    ...family,
    variants,
    defaultVariant: defaultVariant(family, priced.byVariant).id,
    pricedAt: priced.pricedAt,
    failedStores: priced.failed,
  });
  const previous = (await storage.read('index')) as Listing | null;
  const apple = summaries();
  const products = [
    ...apple,
    ...(previous?.products || []).filter((summary) => !familyById[summary.id]),
  ];
  await storage.write('index', mergeListing({ ready: false, products }));
  return true;
}
