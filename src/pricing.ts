import type { Price, Store } from './types';
import { eligiblePrice } from './price-state';
export type PricingOptions = { refund?: boolean; now?: number | null };
export type RankedPrice = Price & { store: Store; usd: number };
// Compare local shelf prices after estimated taxes and optional tourist refunds.
export function effectiveLocal(
  row: Pick<Price, 'local' | 'refundEligible'>,
  store: Store | undefined,
  { refund = true }: PricingOptions = {},
) {
  const tax = store?.tax;
  let amount = row.local;
  if (tax?.added) amount *= 1 + tax.rate;
  if (refund && row.refundEligible !== false && tax?.refund) amount *= 1 - tax.refund;
  return amount;
}
export function toUsd(
  row: Pick<Price, 'local' | 'refundEligible'>,
  store: Store | undefined,
  rates: Record<string, number>,
  options: PricingOptions = {},
) {
  const rate = store ? rates[store.currency] : undefined;
  return rate ? effectiveLocal(row, store, options) / rate : null;
}
export function taxNote(store: Store | undefined, { refund = true }: PricingOptions = {}) {
  const tax = store?.tax;
  if (!tax) return 'No sales tax';
  const rate = `${+(tax.rate * 100).toFixed(1)}% ${tax.label}`;
  if (tax.added) return `${rate} added (est.)`;
  return refund && tax.refund
    ? `${rate} · −${Math.round(tax.refund * 100)}% tourist refund (est.)`
    : `${rate} included`;
}
export function rankPrices(
  variant: { prices?: Price[] } | undefined,
  stores: Record<string, Store>,
  rates: Record<string, number>,
  options: PricingOptions = {},
): RankedPrice[] {
  return (variant?.prices || [])
    .filter((row) => eligiblePrice(row, options.now))
    .flatMap((row) => {
      const store = stores[row.code],
        usd = toUsd(row, store, rates, options);
      return store && usd !== null ? [{ ...row, store, usd }] : [];
    })
    .sort((a, b) => a.usd - b.usd);
}
