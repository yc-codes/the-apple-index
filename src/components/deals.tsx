import { useEffect, useState } from 'react';
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
function Deal({ product: p, active }: { product: Summary; active: boolean }) {
  const { rows, base, money, stores, country } = usePricing(p.prices);
  const best = rows[0];
  return (
    <Link
      to={`/products/${p.id}${p.variant ? '/' + p.variant.id : ''}` as '/'}
      className="deal"
      aria-hidden={!active}
      tabIndex={active ? 0 : -1}
    >
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
  const [index, setIndex] = useState(0),
    [animate, setAnimate] = useState(true),
    [paused, setPaused] = useState(false);
  useEffect(() => {
    if (slides.length < 2 || paused || matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      setAnimate(true);
      setIndex((i) => i + 1);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length, paused]);
  if (!slides.length) return fallback;
  const current = index % slides.length;
  return (
    <div
      className="hero-note deals"
      aria-roledescription="carousel"
      aria-label="Cheapest Apple Stores"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="orbit">◎</span>
      <div className="deal-window">
        <div
          className="deal-track"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transition: animate ? undefined : 'none',
          }}
          // The last slide is a copy of the first; jump back to it unanimated for an endless loop.
          onTransitionEnd={() => {
            if (index < slides.length) return;
            setAnimate(false);
            setIndex(0);
          }}
        >
          {[...slides, ...(slides.length > 1 ? [slides[0]] : [])].map((p, i) => (
            <Deal key={i} product={p} active={i === index} />
          ))}
        </div>
      </div>
      <div className="note-bottom">
        LOCAL PRICES. GLOBAL PERSPECTIVE.
        <span className="deal-count">
          {String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
