import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useProduct, useMeta } from '../api';
import { configurationOptions } from '../configuration.ts';
import { IndexLink, flag, usePreferences } from './layout';
import { Art, PriceRows, RefundToggle, ago, fetchedAt, useNow, usePricing } from './prices';
import type { Product as ProductData, Variant } from '../types';
import { artwork } from '../../server/families';
import { productCategory, site } from '../brand';
export function ProductPage({ id, variantId }: { id: string; variantId?: string }) {
  const query = useProduct();
  useEffect(() => {
    if (query.data) document.title = `${query.data.name} — ${site.name}`;
    return () => {
      document.title = site.title;
    };
  }, [query.data?.name]);
  const navigate = useNavigate();
  useEffect(() => {
    if (query.data && !variantId)
      void navigate({
        to: '/products/$productId/$variantId',
        params: { productId: id, variantId: query.data.defaultVariant },
        replace: true,
      });
  }, [query.data, variantId, id, navigate]);
  if (!query.data)
    return (
      <>
        <IndexLink className="back">← All products</IndexLink>
        <div className="boot" role="alert">
          <p>Prices for this product have not been collected yet. Please check again later.</p>
        </div>
      </>
    );
  const variant = query.data.variants.find(
    (v) => v.id === (variantId || query.data?.defaultVariant),
  );
  if (!variant)
    return (
      <div className="boot">
        <h1>Configuration not found</h1>
        <p>
          This exact configuration isn’t in the current catalog. Your selection hasn’t been changed.
        </p>
        <IndexLink path={`/products/${id}`} className="primary">
          Choose a configuration
        </IndexLink>
      </div>
    );
  return <ProductDetail product={query.data} variant={variant} />;
}
function ProductDetail({ product, variant }: { product: ProductData; variant: Variant }) {
  const { data: meta } = useMeta();
  const { country } = usePreferences();
  const { rows, base, money, stores } = usePricing(variant.prices);
  const [notice, setNotice] = useState({ variant: '', text: '' });
  const best = rows[0];
  const now = useNow();
  // A model may have collected prices for a different configuration. Use neutral coverage
  // copy after collection, including when the loader has removed expired offers.
  const hasCollection = variant.prices.length > 0 || !!product.pricedAt;
  const hasComparablePrices = rows.length > 0;
  const unavailable = (meta?.stores || []).filter(
    (s) => !variant.prices.some((p) => p.code === s.code),
  );
  return (
    <>
      <IndexLink className="back">← All products</IndexLink>
      <section className="detail-top">
        <div>
          <span className="eyebrow">
            {product.brand || 'Apple'} / {productCategory(product)}
          </span>
          <h1>{product.name}</h1>
          <p className="configuration">{variant.label}</p>
          <div className="configuration-selector" aria-label="Product configuration">
            {configurationOptions(product, variant.id).map((group) => (
              <fieldset className="configuration-group" key={group.key}>
                <legend>{group.name}</legend>
                <div className="configuration-options">
                  {group.values.map((option) => {
                    const changes = option.changes
                      .map(
                        (c) =>
                          `${/^[A-Z]{2,}/.test(c.name) ? c.name : c.name.toLowerCase()} to ${c.label}`,
                      )
                      .join(', ');
                    const explanation = changes ? `Also changes ${changes}.` : '';
                    if (!option.target)
                      return (
                        <button
                          type="button"
                          className="spec-button"
                          key={option.key}
                          disabled
                          title="Not available with the selected hardware"
                        >
                          {option.label}
                        </button>
                      );
                    return (
                      <IndexLink
                        key={option.key}
                        className={`spec-button${changes && !option.selected ? ' shifts' : ''}`}
                        path={`/products/${product.id}/${option.target}`}
                        resetScroll={false}
                        data-spec={group.name}
                        data-value={option.label}
                        aria-current={option.selected ? 'true' : 'false'}
                        title={explanation || undefined}
                        onClick={() => setNotice({ variant: option.target!, text: explanation })}
                      >
                        {option.label}
                      </IndexLink>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <p className="configuration-notice" role="status" id="configuration-notice">
            {notice.variant === variant.id ? notice.text : ''}
          </p>
          {product.research && Object.keys(product.fixed).length > 0 && (
            <dl className="product-specs">
              {Object.entries(product.fixed).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <Art
          name={product.name + ' ' + (variant.labels.color || '')}
          image={variant.image || product.image || artwork[product.id]}
          eager
        />
      </section>
      {!hasComparablePrices && product.research ? (
        <section className="coverage-pending" aria-labelledby="coverage-heading">
          <span className="eyebrow">PRICE COVERAGE</span>
          <h2 id="coverage-heading">
            {hasCollection
              ? 'No current prices for this configuration'
              : 'Price comparisons coming soon'}
          </h2>
          <p>
            {hasCollection
              ? 'No current, available prices can be compared for this configuration. Check the official store for its latest price and availability.'
              : 'Specifications are available. Regional prices have not been collected for this configuration yet.'}
          </p>
          <OfficialSources product={product} />
        </section>
      ) : (
        <section className="comparison">
          <aside className="comparison-summary">
            <span className="eyebrow">
              {rows.length === 1 ? 'CURRENT STORE PRICE' : 'THE LOWEST PRICE'}
            </span>
            <h2>{best ? money(best.usd) : '—'}</h2>
            {best && (
              <p>
                {flag(best.code)} {best.store.name}
              </p>
            )}
            {base && best && base.usd > best.usd && (
              <div className="savings-callout">
                <strong>Save {money(base.usd - best.usd)}</strong>
                <span>
                  {((1 - best.usd / base.usd) * 100).toFixed(1)}% less than {stores[country]?.name}
                </span>
              </div>
            )}
            <hr />
            <span className="eyebrow">YOUR CONFIGURATION</span>
            <p className="configuration">{variant.label}</p>
            <span className="eyebrow">YOUR BENCHMARK</span>
            <p>
              {flag(country)} {stores[country]?.name || country.toUpperCase()}
            </p>
            {variant.prices.some((row) => row.refundEligible !== false) && (
              <RefundToggle id="refund" />
            )}
            <p className="selection-note">
              Collected {ago(product.pricedAt, now)}. Each store’s link shows its original currency.
            </p>
          </aside>
          <div className="comparison-table">
            <div className="table-heading">
              <h2>{product.research ? 'Available prices' : 'Prices around the world'}</h2>
              <span>
                {rows.length} {rows.length === 1 ? 'country' : 'countries'}
                {rows.length > 1 ? ' · lowest first' : ''}
              </span>
            </div>
            {rows.length ? (
              <PriceRows prices={variant.prices} pricedAt={product.pricedAt} />
            ) : (
              <p className="empty">No comparable prices available yet.</p>
            )}
            {product.research ? (
              <p className="selection-note">
                Current price coverage: {rows.map((row) => row.store.name).join(', ')}. Other
                markets are pending. Regional models and warranties may differ.
              </p>
            ) : (
              unavailable.length > 0 && (
                <p className="selection-note">
                  Prices unavailable in {unavailable.map((s) => s.name).join(', ')}.{' '}
                  {product.failedStores?.length > 0
                    ? 'Some stores could not be checked in the latest collection.'
                    : 'This does not necessarily mean the configuration is unavailable to buy.'}
                </p>
              )
            )}
          </div>
        </section>
      )}
      {hasComparablePrices && product.research && <OfficialSources product={product} />}
      {product.pricedAt && (
        <p className="last-fetched">Last fetched {fetchedAt(product.pricedAt, now)}</p>
      )}
    </>
  );
}

function OfficialSources({ product }: { product: ProductData }) {
  const research = product.research;
  if (!research) return null;
  return (
    <div className="official-sources">
      {research.note && <p>{research.note}</p>}
      <h3>Official product information</h3>
      <ul>
        {research.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.label} <span aria-hidden="true">↗</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="selection-note">
        Specifications checked{' '}
        {new Date(research.checkedAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })}.{' '}
        Availability, regional hardware and warranty vary by market.
      </p>
    </div>
  );
}
