import { useState } from 'react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import { Link } from '@tanstack/react-router';
import { flag } from './layout';
import { Art, usePricing } from './prices';
import type { Summary } from '../types';
import { artwork } from '../../server/families';

// Alternate categories (Mac, iPhone, iPad, …) so consecutive slides feel different.
function interleave(products: Summary[]) {
  const groups = [...new Set(products.map((p) => p.category))].map((c) =>
    products.filter((p) => p.category === c),
  );
  const longest = Math.max(0, ...groups.map((g) => g.length));
  return Array.from({ length: longest }, (_, i) => groups.flatMap((g) => g[i] ?? [])).flat();
}
const slideVariants = {
  enter: (distance: number) => ({ opacity: 0, x: distance }),
  visible: { opacity: 1, x: 0 },
  exit: (distance: number) => ({ opacity: 0, x: -distance }),
};
function Deal({ product: p, distance }: { product: Summary; distance: number }) {
  const isPresent = useIsPresent();
  const { rows, base, money, stores, country } = usePricing(p.prices);
  const best = rows[0];
  return (
    <motion.div
      className="deal-slide"
      custom={distance}
      variants={slideVariants}
      initial="enter"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      inert={!isPresent}
      aria-hidden={!isPresent || undefined}
    >
      <Link to={`/products/${p.id}${p.variant ? '/' + p.variant.id : ''}` as '/'} className="deal">
        <div className="deal-product">
          <div>
            <span className="deal-kicker">{p.name}</span>
            <span className="deal-configuration">{p.variant?.label}</span>
          </div>
          <Art name={p.name} image={p.image || artwork[p.id]} />
        </div>
        <span className="eyebrow">LOWEST TRACKED PRICE</span>
        <span className="deal-country">{best ? `${flag(best.code)} ${best.store.name}` : '—'}</span>
        <strong className="deal-price">{best ? money(best.usd) : '—'}</strong>
        <span className="deal-note">
          {!best || !base
            ? 'Compare available regional prices'
            : base.code === best.code
              ? 'Your country has the lowest tracked price'
              : `Save ${money(base.usd - best.usd)} vs ${stores[country]?.name || country.toUpperCase()}`}
        </span>
        <span className="deal-link">
          Compare {rows.length} countries <span aria-hidden="true">↗</span>
        </span>
      </Link>
    </motion.div>
  );
}
export function Deals({ products, fallback }: { products: Summary[]; fallback: React.ReactNode }) {
  const slides = interleave(products.filter((p) => p.ready && p.prices?.length));
  const reduceMotion = useReducedMotion();
  const [{ index, direction }, setSlide] = useState({ index: 0, direction: 1 });
  if (!slides.length) return fallback;
  const current = index % slides.length;
  const distance = reduceMotion ? 0 : direction * 24;
  const step = (direction: number) =>
    setSlide(({ index }) => ({
      index: (index + direction + slides.length) % slides.length,
      direction,
    }));
  return (
    <div className="hero-note deals" role="region" aria-label="Featured price comparisons">
      <div className="eyebrow">FEATURED COMPARISON</div>
      <div className="deal-window" aria-live="polite" aria-atomic="true">
        <AnimatePresence initial={false} custom={distance}>
          <Deal key={slides[current].id} product={slides[current]} distance={distance} />
        </AnimatePresence>
      </div>
      <div className="note-bottom">
        <span className="deal-count">
          {current + 1} of {slides.length} comparisons
        </span>
        {slides.length > 1 && (
          <div className="deal-controls">
            <button type="button" aria-label="Previous comparison" onClick={() => step(-1)}>
              ←
            </button>
            <button type="button" aria-label="Next comparison" onClick={() => step(1)}>
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
