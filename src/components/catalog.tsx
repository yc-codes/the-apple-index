import { useState } from 'react';
import { useListing, useMeta } from '../api';
import { IndexLink, flag, usePreferences } from './layout';
import { Art, PriceRows, usePricing } from './prices';
import { Deals } from './deals';
import type { Summary } from '../types';
import { artwork } from '../../server/families';
const categories = ['All products', 'Mac', 'iPhone', 'iPad', 'Watch', 'TV & Home'];
function Card({ product: p }: { product: Summary }) {
  const { rows, money } = usePricing(p.prices);
  const path = `/products/${p.id}${p.variant ? '/' + p.variant.id : ''}`;
  return (
    <article className={`product-card${p.ready ? '' : ' loading-card'}`}>
      <IndexLink path={path} className="card-top" data-product={p.id}>
        <div>
          <span className="eyebrow">
            {p.category}
            {p.configurations ? ` · ${p.configurations} configurations` : ''}
          </span>
          <h3>{p.name}</h3>
          <p>
            {p.ready ? `From: ${p.variant?.label}` : 'Awaiting the first Apple price collection'}
          </p>
        </div>
        <span className="circle-arrow">↗</span>
      </IndexLink>
      <Art name={p.name} image={p.image || artwork[p.id]} />
      <div className="card-prices">
        {p.ready && (
          <>
            <div className="card-meta">
              <span>LOWEST PRICE</span>
              <strong>{rows[0] ? money(rows[0].usd) : '—'}</strong>
            </div>
            <PriceRows prices={p.prices || []} compact />
          </>
        )}
        <IndexLink path={path} className="all-prices">
          {p.ready ? `Compare ${rows.length} countries` : 'View product'} <span>→</span>
        </IndexLink>
      </div>
    </article>
  );
}
export function Catalog() {
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
            <i className="live-dot" /> THE WORLDWIDE APPLE PRICE INDEX
          </div>
          <h1>
            Same Apple.
            <br />
            Different <em>price.</em>
          </h1>
          <p>
            Apple Store prices from around the world, in your currency.
            <br />
            Compare the same configuration, wherever you buy.
          </p>
          <a className="primary" href="#catalog">
            Find your next Apple <span>↘</span>
          </a>
        </div>
        <Deals
          products={products}
          fallback={
            <div className="hero-note">
              <span className="orbit">◎</span>
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
      </section>
      <section id="catalog">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE INDEX</span>
            <h2>Good things. Better prices.</h2>
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
                {c}
              </button>
            ))}
          </div>
          <label className="search">
            <span>⌕</span>
            <input
              id="search"
              type="search"
              placeholder="Find a product"
              aria-label="Find a product"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="product-grid">
          {visible.length ? (
            visible.map((p) => <Card key={p.id} product={p} />)
          ) : (
            <p className="empty">No products found. Try another search or category.</p>
          )}
        </div>
      </section>
    </>
  );
}
