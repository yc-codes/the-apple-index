import type { Price } from './types';

// null is a hydration-stable render of data already filtered by the route loader.
export function eligiblePrice(price: Price, now: number | null = Date.now()) {
  if (!Number.isFinite(price.local) || price.local <= 0) return false;
  if (price.availability && price.availability !== 'in-stock') return false;
  return now === null || !price.expiresAt || Date.parse(price.expiresAt) > now;
}
