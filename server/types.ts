import type { Dimension, Listing, Price, Product, Store, Variant } from '../src/types';

export type Family = { id: string; name: string; category: string; path: string };
export type AppleStore = Store & { store: string };
export type CatalogVariant = Omit<Variant, 'prices'> & { part: string; name?: string };
export type Catalog = Family & {
  url: string;
  image: string | null;
  dimensions: Dimension[];
  fixed: Record<string, string>;
  variants: CatalogVariant[];
  discoveredAt: string;
};
export type ConfigurationPage = { part: string; image?: string };
export type ShelfPrice = { value: number; display: string | null; name: string | null };
export type RegionalPrice = ShelfPrice & { part: string };
export type FamilyPrices = Record<string, RegionalPrice>;
export type PriceCollection = {
  pricedAt: string;
  failed: string[];
  byVariant: Record<string, Price[]>;
};
export type StoreSnapshot = { version: string; at: string; prices: FamilyPrices };
export type ExchangeRates = {
  base: string;
  updated: string;
  source: string;
  rates: Record<string, number>;
};
export type CollectorStatus = {
  at: string;
  attempts: Record<string, number>;
  blockedUntil: string | null;
  failed: number;
};
export type CacheEntry<T> = { value?: T; at?: number; pending?: Promise<T> };
export type CollectorSchema = {
  rates: ExchangeRates;
  [key: `catalog-${string}`]: Catalog;
  [key: `prices-${string}`]: PriceCollection;
  [key: `store-${string}`]: StoreSnapshot;
  [key: `page-${string}`]: ConfigurationPage | null;
  [key: `regional-${string}`]: Record<string, string>;
};
export type PublishedSchema = {
  index: Listing;
  rates: CacheEntry<ExchangeRates>;
  'collector-status': CollectorStatus;
  [key: `product-${string}`]: Product;
};
export interface StorageReader {
  read(key: string): Promise<unknown>;
}
export interface Storage extends StorageReader {
  write(key: string, value: unknown): Promise<void>;
}
