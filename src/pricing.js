// Turns Apple shelf prices into comparable prices for a visitor.
// Shelf prices include VAT/GST everywhere except the US and Canada, where an estimated sales tax is added.
// With `refund` on, the estimated tourist tax refund is deducted where one exists.
export function effectiveLocal(row, store, { refund = true } = {}) {
  const tax = store?.tax;
  let amount = row.local;
  if (tax?.added) amount *= 1 + tax.rate;
  if (refund && tax?.refund) amount *= 1 - tax.refund;
  return amount;
}
export function toUsd(row, store, rates, options) {
  const rate = rates[store?.currency];
  return rate ? effectiveLocal(row, store, options) / rate : null;
}
export function taxNote(store, { refund = true } = {}) {
  const tax = store?.tax;
  if (!tax) return 'No sales tax';
  const rate = `${+(tax.rate * 100).toFixed(1)}% ${tax.label}`;
  if (tax.added) return `${rate} added (est.)`;
  return refund && tax.refund
    ? `${rate} · −${Math.round(tax.refund * 100)}% tourist refund (est.)`
    : `${rate} included`;
}
// Rows for one configuration, lowest first, each with its USD equivalent.
export function rankPrices(variant, stores, rates, options) {
  return (variant?.prices || [])
    .map((row) => {
      const store = stores[row.code];
      return { ...row, store, usd: toUsd(row, store, rates, options) };
    })
    .filter((r) => r.usd != null)
    .sort((a, b) => a.usd - b.usd);
}
