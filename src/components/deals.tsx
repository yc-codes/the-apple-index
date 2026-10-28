import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { flag } from './layout';
import { usePricing } from './prices';
import type { Summary } from '../types';

// Alternate categories (Mac, iPhone, iPad, …) so consecutive slides feel different.
function interleave(products: Summary[]) {
  const groups = [...new Set(products.map((p) => p.category))].map((c) =>
    products.filter((p) => p.category === c),
  );
  const longest = Math.max(0, ...groups.map((g) => g.length));
  return Array.from({ length: longest }, (_, i) => groups.flatMap((g) => g[i] ?? [])).flat();
}
function Deal({ product: p }: { product: Summary }) {
  const { rows, base, money, stores, country } = usePricing(p.prices);
  const best = rows[0];
  return (
    <Link to={`/products/${p.id}${p.variant ? '/' + p.variant.id : ''}` as '/'} className="deal">
      <span className="deal-kicker">Cheapest {p.name} in</span>
      <span className="deal-country">{best ? `${flag(best.code)} ${best.store.name}` : '—'}</span>
      <strong className="deal-price">{best ? money(best.usd) : '—'}</strong>
      <span className="deal-note">
        {!best || !base
          ? p.variant?.label
          : base.code === best.code
            ? `Your country is the cheapest · ${p.variant?.label}`
            : `Save ${money(base.usd - best.usd)} vs ${stores[country]?.name || country.toUpperCase()}`}
      </span>
    </Link>
  );
}
export function Deals({ products, fallback }: { products: Summary[]; fallback: React.ReactNode }) {
  const slides = interleave(products.filter((p) => p.ready && p.prices?.length));
  const [index, setIndex] = useState(0);
  if (!slides.length) return fallback;
  const current = index % slides.length;
  return (
    <div className="hero-note deals" role="region" aria-label="Featured price comparisons">
      <div className="eyebrow">A WORLD OF BETTER PRICES</div>
      <div className="deal-window" aria-live="polite">
        <Deal product={slides[current]} />
      </div>
      <div className="note-bottom">
        <span className="deal-count">
          {current + 1} of {slides.length} comparisons
        </span>
        {slides.length > 1 && (
          <div className="deal-controls">
            <button
              type="button"
              aria-label="Previous comparison"
              onClick={() => setIndex((current + slides.length - 1) % slides.length)}
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Next comparison"
              onClick={() => setIndex((current + 1) % slides.length)}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
