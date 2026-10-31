import { forwardRef, useId, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useIsPresent, useReducedMotion } from 'motion/react';
import { useListing, useMeta } from '../api';
import { IndexLink, flag, usePreferences } from './layout';
import { Art, PriceRows, RefundToggle, usePricing } from './prices';
import { Deals } from './deals';
import type { Summary } from '../types';
import { artwork } from '../../server/families';
const categories = ['All products', 'Mac', 'iPhone', 'iPad', 'Watch', 'TV & Home'];
const Card = forwardRef<HTMLElement, { product: Summary }>(function Card({ product: p }, ref) {
  const isPresent = useIsPresent();
  const reduceMotion = useReducedMotion();
  const { rows, money } = usePricing(p.prices);
  const path = `/products/${p.id}${p.variant ? '/' + p.variant.id : ''}`;
  return (
    <motion.article
      ref={ref}
      layout={reduceMotion ? false : 'position'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ opacity: { duration: 0.18 }, layout: { duration: 0.28, ease: 'easeOut' } }}
      inert={!isPresent}
      aria-hidden={!isPresent || undefined}
      className={`product-card${p.ready ? '' : ' loading-card'}`}
    >
      <IndexLink path={path} className="card-top" data-product={p.id}>
        <div>
          <span className="eyebrow">
            {p.category}
            {p.configurations ? ` · ${p.configurations} configurations` : ''}
          </span>
          <h3>{p.name}</h3>
          <p title={p.ready ? p.variant?.label : undefined}>
            {p.ready ? `From: ${p.variant?.label}` : 'Awaiting the first Apple price collection'}
          </p>
        </div>
        <span className="circle-arrow" aria-hidden="true">
          ↗
        </span>
      </IndexLink>
      <Art name={p.name} image={p.image || artwork[p.id]} />
      <div className="card-prices">
        {p.ready && (
          <>
            <div className="card-meta">
              <span>LOWEST TRACKED PRICE</span>
              <strong>{rows[0] ? money(rows[0].usd) : '—'}</strong>
            </div>
            <PriceRows prices={p.prices || []} compact />
          </>
        )}
        <IndexLink path={path} className="all-prices">
          {p.ready ? `Compare ${rows.length} countries` : 'View product'} <span>→</span>
        </IndexLink>
      </div>
    </motion.article>
  );
});
export function Catalog() {
  const layoutId = useId();
  const reduceMotion = useReducedMotion();
  const searchInput = useRef<HTMLInputElement>(null);
  const listing = useListing();
  const { data: meta } = useMeta();
  const { country } = usePreferences();
  const [filter, setFilter] = useState('All products'),
    [search, setSearch] = useState('');
  const countries = meta?.stores || [];
  const products = listing.data?.products || [];
  const tracked = products.reduce((n, p) => n + (p.configurations || 0), 0);
  const visible = products.filter(
    (p) =>
      (filter === 'All products' || p.category === filter) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">
            <i className="live-dot" aria-hidden="true" /> THE WORLDWIDE APPLE PRICE INDEX
          </div>
          <h1>
            Same Apple.
            <br />
            Different <em>price.</em>
          </h1>
          <p>
            Apple Store prices from around the world, in your currency. <br />
            Compare the same configuration, wherever you buy.
          </p>
          <a className="primary" href="#catalog">
            Explore products <span aria-hidden="true">↘</span>
          </a>
        </div>
        <div className="hero-feature">
          <Deals
            products={products}
            fallback={
              <div className="hero-note">
                <div className="stat">
                  <strong>{countries.length || 39}</strong>
                  <span>
                    countries.
                    <br />
                    {listing.data?.ready
                      ? `${tracked} configurations tracked.`
                      : `${products.filter((p) => p.ready).length} product families ready.`}
                  </span>
                </div>
                <div className="note-bottom">
                  LOCAL PRICES. GLOBAL PERSPECTIVE.<span>↗</span>
                </div>
              </div>
            }
          />
        </div>
      </section>
      <section id="catalog">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE INDEX</span>
            <h2>Find your next Apple.</h2>
          </div>
          <p>
            Compared with{' '}
            <strong>
              {countries.find((c) => c.code === country)?.name || country.toUpperCase()}
            </strong>{' '}
            {flag(country)}
          </p>
        </div>
        <div className="catalog-tools">
          <LayoutGroup id={layoutId}>
            <div className="tabs" role="group" aria-label="Product category">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c}
                  data-filter={c}
                  aria-pressed={filter === c}
                  className={filter === c ? 'active' : ''}
                  onClick={() => setFilter(c)}
                >
                  {filter === c && (
                    <motion.span
                      className="tab-highlight"
                      layoutId={reduceMotion ? undefined : 'category'}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="tab-label">{c}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>
          <label className="search">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>
            <input
              ref={searchInput}
              id="search"
              type="search"
              placeholder="Find a product"
              aria-label="Find a product"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="results-toolbar">
          <p className="results-count" role="status">
            {visible.length} {visible.length === 1 ? 'product' : 'products'}
            {filter !== 'All products' ? ` in ${filter}` : ''}
          </p>
          <RefundToggle id="catalog-refund" />
        </div>
        <div className="product-grid">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.length ? (
              visible.map((p) => <Card key={p.id} product={p} />)
            ) : (
              <motion.div
                key="empty"
                className="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h3>No matching products</h3>
                <p>Try a different name or browse all products.</p>
                <button
                  type="button"
                  className="reset-filters"
                  onClick={() => {
                    setSearch('');
                    setFilter('All products');
                    searchInput.current?.focus();
                  }}
                >
                  Clear filters
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}
