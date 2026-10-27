import listing from '../data/index.json';
import { stores } from '../server/stores';
import type { CacheEntry, ExchangeRates } from '../server/types';
import type { Listing, Meta, Product } from './types';

const rates = import.meta.glob<CacheEntry<ExchangeRates>>('../data/rates.json', {
  eager: true,
  import: 'default',
});
const products = import.meta.glob<Product>('../data/product-*.json', { import: 'default' });
export const getListing = (): Listing => listing;
export const getMeta = (): Meta => ({
  stores: stores.map(({ code, name, currency, tax }) => ({ code, name, currency, tax })),
  rates: rates['../data/rates.json']?.value || null,
});
export const getProduct = async (id: string): Promise<Product | null> =>
  products[`../data/product-${id}.json`]?.() ?? null;
