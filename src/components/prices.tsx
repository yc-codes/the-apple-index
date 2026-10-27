import { useEffect, useState } from 'react';
import { rankPrices, taxNote } from '../pricing.ts';
import { useMeta } from '../api';
import { flag, usePreferences } from './layout';
import type { Price } from '../types';
export function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  return now;
}
export function ago(iso?: string, now: number | null = null) {
  if (!iso) return 'not yet';
  if (now === null) return new Date(iso).toLocaleDateString('en-GB', { timeZone: 'UTC' });
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  return minutes < 1
    ? 'just now'
    : minutes < 60
      ? `${minutes} min ago`
      : minutes < 2880
        ? `${Math.round(minutes / 60)} h ago`
        : new Date(iso).toLocaleDateString('en-GB');
}
// UTC until hydrated (stable prerendered markup), then the visitor's local time.
export function fetchedAt(iso: string, now: number | null) {
  const d = new Date(iso);
  if (now !== null) return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  // Built by hand: server and browser ICU data can format the same date differently.
  const month = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[d.getUTCMonth()];
  const time = [d.getUTCHours(), d.getUTCMinutes()].map((n) => String(n).padStart(2, '0'));
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}, ${time.join(':')} UTC`;
}
export function Art({
  name,
  image,
  eager = false,
}: {
  name: string;
  image?: string | null;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  return (
    <div className="product-art">
      {image && failed !== image ? (
        <img
          src={image}
          alt={name}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(image)}
        />
      ) : (
        <span className="image-fallback">{name}</span>
      )}
    </div>
  );
}
export function usePricing(prices: Price[] = []) {
  const { data: meta } = useMeta();
  const { country, currency, refund } = usePreferences();
  const stores = Object.fromEntries((meta?.stores || []).map((s) => [s.code, s]));
  const rates = meta?.rates?.rates || {};
  const rows = rankPrices({ prices }, stores, rates, { refund });
  const money = (usd: number) =>
    rates[currency]
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(usd * rates[currency])
      : '—';
  return { rows, base: rows.find((r) => r.code === country), money, stores, refund, country };
}
export function PriceRows({
  prices,
  compact = false,
  pricedAt,
}: {
  prices: Price[];
  compact?: boolean;
  pricedAt?: string;
}) {
  const { rows, base, money, country, refund } = usePricing(prices);
  const now = useNow();
  return (
    <>
      {(compact ? rows.slice(0, 3) : rows).map((row, i) => {
        const diff = base ? (row.usd / base.usd - 1) * 100 : null;
        const stale = row.at && pricedAt && Date.parse(pricedAt) - Date.parse(row.at) > 60_000;
        return (
          <div className="price-row" key={row.code}>
            <span className="rank">{String(i + 1).padStart(2, '0')}</span>
            <span className="flag">{flag(row.code)}</span>
            <div className="country">
              {row.store.name} {row.code === country && <small className="base">BASE</small>}
              <small>{taxNote(row.store, { refund })}</small>
            </div>
            <div className="price">
              <strong>{money(row.usd)}</strong>
              <small className={diff !== null && diff < 0 ? 'saving' : ''}>
                {diff === null
                  ? 'No price in your country'
                  : Math.abs(diff) < 0.05
                    ? 'Your benchmark'
                    : `${diff > 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)}%`}
              </small>
              {!compact && (
                <small className="shelf">
                  Apple: {row.display || `${row.local} ${row.store.currency}`}
                  {stale && ` · from ${ago(row.at, now)}`}
                </small>
              )}
            </div>
            {!compact && row.url && (
              <a
                className="store"
                href={row.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open the ${row.store.name} Apple Store`}
              >
                ↗
              </a>
            )}
          </div>
        );
      })}
    </>
  );
}
