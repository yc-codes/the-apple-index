import bundledListing from '../data/index.json';
import { stores } from '../server/stores';
import type { CacheEntry, ExchangeRates } from '../server/types';
import type { Listing, Meta, Product } from './types';
import { mergeListing, newerSnapshot, resolveProduct } from './catalog-data';

// JSON imports widen string literals; published snapshots share the collector's Listing contract.
const listing = bundledListing as Listing;

const rates = import.meta.glob<CacheEntry<ExchangeRates>>('../data/rates.json', {
  eager: true,
  import: 'default',
});
const products = import.meta.glob<Product>('../data/product-*.json', { import: 'default' });
// Browsers read the data branch directly so new prices appear without a redeploy.
// Prerendering and the SSR fallback keep using the snapshot bundled at build time.
const source = 'https://raw.githubusercontent.com/yc-codes/the-apple-index/data/';
async function live<T>(file: string): Promise<T | null> {
  if (typeof window === 'undefined' || !import.meta.env.VITE_LIVE_DATA) return null;
  try {
    const response = await fetch(source + file, { signal: AbortSignal.timeout(8000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
export const getListing = async (): Promise<Listing> =>
  mergeListing((await live<Listing>('index.json')) ?? listing, listing);
export const getMeta = async (): Promise<Meta> => ({
  stores: stores.map(({ code, name, currency, tax }) => ({ code, name, currency, tax })),
  rates:
    (await live<CacheEntry<ExchangeRates>>('rates.json'))?.value ??
    rates['../data/rates.json']?.value ??
    null,
});
export const getProduct = async (id: string): Promise<Product | null> => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return null;
  const [latest, bundled] = await Promise.all([
    live<Product>(`product-${id}.json`),
    products[`../data/product-${id}.json`]?.(),
  ]);
  return resolveProduct(id, newerSnapshot(latest?.id === id ? latest : null, bundled));
};
