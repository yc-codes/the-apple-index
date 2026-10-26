export type Price = {
  code: string;
  local: number;
  display?: string;
  part?: string;
  at?: string;
  url?: string;
};
export type Store = {
  code: string;
  name: string;
  currency: string;
  tax: { rate: number; label: string; added?: boolean; refund?: number } | null;
};
export type Variant = {
  id: string;
  label: string;
  image?: string;
  specs: Record<string, string>;
  labels: Record<string, string>;
  prices: Price[];
};
export type Dimension = { key: string; name: string; values: { key: string; label: string }[] };
export type Product = {
  id: string;
  name: string;
  category: string;
  image?: string;
  variants: Variant[];
  dimensions: Dimension[];
  fixed: Record<string, string>;
  defaultVariant: string;
  pricedAt: string;
  failedStores: string[];
};
export type Summary = {
  id: string;
  name: string;
  category: string;
  ready: boolean;
  image?: string;
  variant?: { id: string; label: string };
  prices?: Price[];
  configurations?: number;
  pricedAt?: string;
};
export type Listing = { ready: boolean; products: Summary[] };
export type Meta = {
  stores: Store[];
  rates: { rates: Record<string, number>; updated: string } | null;
};
export type Preferences = { country?: string; currency?: string };
