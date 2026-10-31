export type Price = {
  code: string;
  local: number;
  display?: string | null;
  part?: string;
  at?: string;
  url?: string;
  source?: string;
  expiresAt?: string;
  availability?: 'in-stock' | 'out-of-stock' | 'unknown';
  refundEligible?: boolean;
};
export type Store = {
  code: string;
  name: string;
  currency: string;
  tax: { rate: number; label: string; added?: boolean; refund?: number } | null;
};
export type Variant = {
  id: string;
  part?: string;
  label: string;
  image?: string | null;
  specs: Record<string, string>;
  labels: Record<string, string>;
  prices: Price[];
};
export type Dimension = { key: string; name: string; values: { key: string; label: string }[] };
export type Product = {
  id: string;
  name: string;
  category: string;
  brand?: string;
  research?: {
    checkedAt: string;
    sources: { label: string; url: string; market?: string }[];
    note?: string;
  };
  image?: string | null;
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
  brand?: string;
  priceStatus?: 'pending' | 'collected';
  ready: boolean;
  image?: string | null;
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
