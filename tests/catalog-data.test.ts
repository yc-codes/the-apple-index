import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeListing, newerSnapshot, productSummary, resolveProduct } from '../src/catalog-data';
import { families } from '../server/families';
import { researchedProductById, researchedProducts } from '../server/products';
import { product } from './fixtures';

const now = Date.parse('2026-10-31T12:00:00Z');
test('researched models are navigable without fabricated prices and cannot enter Apple collection', () => {
  const appleIds = new Set(families.map((family) => family.id));
  assert.equal(researchedProducts.length, 17);
  for (const reference of researchedProducts) {
    assert.ok(!appleIds.has(reference.id));
    const resolved = resolveProduct(reference.id, null, now)!;
    assert.ok(resolved.variants.some((variant) => variant.id === resolved.defaultVariant));
    assert.ok(resolved.research?.sources.every((source) => source.url.startsWith('https://')));
    assert.equal(resolved.pricedAt, '');
    assert.ok(resolved.variants.every((variant) => !variant.prices.length));
    assert.equal(productSummary(resolved, now).ready, true);
    assert.equal(productSummary(resolved, now).priceStatus, 'pending');
  }
  assert.equal(researchedProductById['poco-x8-pro']?.research?.sources[0].market, 'ae');
});

test('old live Apple-only listing retains newer bundled Xiaomi prices and all researched models', () => {
  const xiaomi = { ...researchedProductById['xiaomi-17t']!, pricedAt: '2026-10-31T10:00:00Z' };
  xiaomi.variants = xiaomi.variants.map((variant, index) => ({
    ...variant,
    prices: index
      ? []
      : [{ code: 'in', local: 69999, source: 'Xiaomi India', expiresAt: '2026-11-01T22:00:00Z' }],
  }));
  const apple = productSummary(product, now);
  const bundled = { ready: true, products: [apple, productSummary(xiaomi, now)] };
  const live = { ready: true, products: [{ ...apple, pricedAt: '2026-10-30T00:00:00Z' }] };
  const merged = mergeListing(live, bundled, now);
  assert.equal(merged.products.length, 18);
  assert.equal(merged.products.find((row) => row.id === xiaomi.id)?.prices?.[0].local, 69999);
  assert.equal(merged.products.find((row) => row.id === product.id)?.brand, 'Apple');
  assert.equal(new Set(merged.products.map((row) => row.id)).size, merged.products.length);
  assert.equal(newerSnapshot(xiaomi, { ...xiaomi, pricedAt: '2026-10-30T00:00:00Z' }), xiaomi);
});

test('expired offers disappear from listing and detail but verified configurations remain', () => {
  const reference = researchedProductById['xiaomi-17t']!;
  const snapshot = {
    ...reference,
    variants: reference.variants.map((variant) => ({
      ...variant,
      prices: [{ code: 'in', local: 500, expiresAt: '2026-10-31T11:00:00Z' }],
    })),
  };
  assert.equal(resolveProduct(reference.id, snapshot, now)?.variants[0].prices.length, 0);
  assert.equal(productSummary(snapshot, now).prices?.length, 0);
  assert.equal(resolveProduct('unknown-product', snapshot, now), null);
  assert.deepEqual(
    resolveProduct(product.id, product, now)?.variants[0].prices,
    product.variants[0].prices,
  );
});

test('expired default falls back to a fresh configuration without removing the old URL', () => {
  const reference = researchedProductById['xiaomi-17t']!;
  const snapshot = {
    ...reference,
    variants: reference.variants.map((variant, index) => ({
      ...variant,
      prices: [
        {
          code: 'in',
          local: 500 + index,
          expiresAt: index ? '2026-11-01T12:00:00Z' : '2026-10-31T11:00:00Z',
        },
      ],
    })),
  };
  assert.equal(productSummary(snapshot, now).variant?.id, reference.variants[1].id);
  const resolved = resolveProduct(reference.id, snapshot, now)!;
  assert.equal(resolved.defaultVariant, reference.variants[1].id);
  assert.equal(
    resolved.variants.find((variant) => variant.id === reference.defaultVariant)?.prices.length,
    0,
  );
});
