import { familyById } from '../server/families';
import { researchedProductById, researchedProducts } from '../server/products';
import type { Listing, Product, Summary } from './types';
import { eligiblePrice } from './price-state';

export function newerSnapshot<T extends { pricedAt?: string }>(
  primary?: T | null,
  fallback?: T | null,
): T | null {
  if (!primary) return fallback || null;
  if (!fallback) return primary;
  const primaryAt = Date.parse(primary.pricedAt || '') || 0;
  const fallbackAt = Date.parse(fallback.pricedAt || '') || 0;
  return fallbackAt > primaryAt ? fallback : primary;
}

export function productSummary(product: Product, now = Date.now()): Summary {
  const preferred =
    product.variants.find((variant) => variant.id === product.defaultVariant) ||
    product.variants[0];
  const variant = preferred?.prices.some((price) => eligiblePrice(price, now))
    ? preferred
    : product.variants.find((variant) =>
        variant.prices.some((price) => eligiblePrice(price, now)),
      ) || preferred;
  const prices = variant?.prices.filter((price) => eligiblePrice(price, now)) || [];
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand || (familyById[product.id] ? 'Apple' : undefined),
    ready: !!variant,
    priceStatus: prices.length ? 'collected' : 'pending',
    image: variant?.image || product.image,
    variant: variant && { id: variant.id, label: variant.label },
    prices,
    configurations: product.variants.length,
    pricedAt: product.pricedAt || undefined,
  };
}

// Old live snapshots may contain only Apple. Always retain the bundled researched catalog.
// Existing collected summaries override catalog-only defaults, but never revive expired offers.
export function mergeListing(listing: Listing, fallback?: Listing, now = Date.now()): Listing {
  const candidates = new Map(fallback?.products.map((summary) => [summary.id, summary]));
  for (const summary of listing.products)
    candidates.set(summary.id, newerSnapshot(summary, candidates.get(summary.id))!);
  const byId = new Map<string, Summary>(
    [...candidates.values()].map((summary) => {
      const prices = summary.prices?.filter((price) => eligiblePrice(price, now));
      return [
        summary.id,
        {
          ...summary,
          prices,
          brand: summary.brand || (familyById[summary.id] ? 'Apple' : undefined),
          priceStatus: prices?.length ? ('collected' as const) : ('pending' as const),
        },
      ];
    }),
  );
  for (const product of researchedProducts) {
    const existing = byId.get(product.id);
    byId.set(
      product.id,
      existing?.ready ? { ...existing, brand: product.brand } : productSummary(product, now),
    );
  }
  const products = [...byId.values()];
  return { ready: products.every((product) => product.ready), products };
}

export function resolveProduct(
  id: string,
  snapshot?: Product | null,
  now = Date.now(),
): Product | null {
  const reference = researchedProductById[id];
  const product = snapshot?.id === id && snapshot.variants?.length ? snapshot : reference;
  if (!product) return null;
  const variants = product.variants.map((variant) => ({
    ...variant,
    prices: variant.prices.filter((price) => eligiblePrice(price, now)),
  }));
  const preferred = variants.find((variant) => variant.id === product.defaultVariant);
  const defaultVariant = preferred?.prices.length
    ? preferred.id
    : variants.find((variant) => variant.prices.length)?.id || product.defaultVariant;
  return {
    ...product,
    brand: reference?.brand || product.brand || (familyById[id] ? 'Apple' : undefined),
    research: reference?.research || product.research,
    variants,
    defaultVariant,
  };
}
