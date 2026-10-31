import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseXiaomiCatalog,
  parseXiaomiTabletCatalog,
  updateXiaomiProduct,
  xiaomiFreshnessMs,
} from '../server/xiaomi';
import { researchedProductById } from '../server/products';
import { collectAndroid, publishAndroidCatalog } from '../server/android';
import { collectTablets } from '../server/tablets';
import { productSummary } from '../src/catalog-data';
import { selectConfiguration, changedDimensions } from '../src/configuration';
import { rankPrices } from '../src/pricing';
import { storeByCode } from '../server/stores';
import { product } from './fixtures';
import type { Storage } from '../server/types';
import type { Listing, Product } from '../src/types';

const at = '2026-10-31T12:00:00Z';
const now = Date.parse(at);
// Minimal synthetic markup following the publicly observed card structure; never production prices.
const card = (
  title = 'Xiaomi 17T 12 GB + 256 GB Violet',
  price = '₹60,000<del>₹80,000</del>',
  available = true,
) =>
  `<div class="goods-item"><h2 class="title"><a href="https://store.mi.com/in/item/123">${title}</a></h2><p class="price">${price}</p><div class="figure"><img src="https://i03.appmifile.com/test.png"></div><div class="actions">${available ? '<a class="J_buyGoods" data-disabled="false" data-gid="456">ADD TO CART</a>' : '<a>OUT OF STOCK</a>'}</div></div>`;
const reference = researchedProductById['xiaomi-17t']!;
const tabletCard = (
  title = 'Xiaomi Pad 8 Graphite Grey 8 GB + 128 GB Standard',
  sku = '3224101440',
) =>
  card(title).replace('/item/123', `/item/${sku}`).replace('data-gid="456"', `data-gid="${sku}99"`);

test('tablet matching requires the researched SKU, connectivity, edition and color; phone scope stays separate', () => {
  const html =
    tabletCard() +
    tabletCard('Redmi Pad 2 Pro Graphite Grey 8 GB + 128 GB', '3224101322') +
    tabletCard('Redmi Pad 2 Pro 5G Graphite Grey 8 GB + 128 GB', '3224101312');
  const rows = parseXiaomiTabletCatalog(html, at);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].variant.id, '8gb-128gb-wifi-standard-grey');
  assert.equal(rows[0].variant.specs.edition, 'Standard');
  assert.equal(rows[0].variant.specs.color, 'Graphite Grey');
  assert.equal(rows[1].variant.specs.connectivity, 'Wi-Fi');
  assert.equal(rows[2].variant.specs.connectivity, 'Wi-Fi + 5G');
  assert.throws(() => parseXiaomiCatalog(html, at), /No verified/);
  assert.throws(() => parseXiaomiTabletCatalog(card(), at), /No verified/);
  for (const invalid of [
    tabletCard('Xiaomi Pad 8 Graphite Grey 8 GB + 128 GB Standard + Keyboard'),
    tabletCard('Xiaomi Pad 8 Graphite Grey 8 GB + 128 GB Nano Texture'),
    tabletCard('Xiaomi Pad 8 Graphite Grey 8 GB + 256 GB Standard'),
    tabletCard('Xiaomi Pad 8 Graphite Grey 8 GB + 128 GB Standard', '999'),
    tabletCard('Redmi Pad 2 Pro 5G Graphite Grey 8 GB + 128 GB', '3224101322'),
    tabletCard('Redmi Pad 2 Pro Graphite Grey 8 GB + 128 GB', '3224101312'),
  ])
    assert.throws(() => parseXiaomiTabletCatalog(invalid, at), /No verified/);
});

test('tablet collection preserves phone observations and failure scope, then phone collection preserves tablets', async () => {
  const phone = updateXiaomiProduct(reference, parseXiaomiCatalog(card(), at), at);
  const data = new Map<string, unknown>([[`product-${phone.id}`, phone]]);
  const storage: Storage = {
    read: async (key) => data.get(key) || null,
    write: async (key, value) => {
      data.set(key, value);
    },
  };
  const result = await collectTablets(
    storage,
    (async () => new Response(tabletCard())) as typeof fetch,
  );
  assert.equal(result.offers, 1);
  assert.equal(data.get(`product-${phone.id}`), phone);
  const tablet = data.get('product-xiaomi-pad-8') as Product;
  assert.equal(tablet.variants.length, 1);
  assert.equal(tablet.variants[0].specs.connectivity, 'Wi-Fi');
  assert.equal(tablet.dimensions.length, 0);
  await collectAndroid(storage, (async () => new Response(card())) as typeof fetch);
  assert.equal(data.get('product-xiaomi-pad-8'), tablet);
  await assert.rejects(
    collectTablets(storage, (async () => new Response('blocked', { status: 403 })) as typeof fetch),
    /403/,
  );
  await publishAndroidCatalog(storage);
  assert.equal(data.get('product-xiaomi-pad-8'), tablet);
  assert.deepEqual(tablet.failedStores, []);
  const unavailable = parseXiaomiTabletCatalog(
    tabletCard().replace(
      '<a class="J_buyGoods" data-disabled="false" data-gid="322410144099">ADD TO CART</a>',
      '<a>OUT OF STOCK</a>',
    ),
    at,
  );
  const refreshed = updateXiaomiProduct(
    researchedProductById['xiaomi-pad-8']!,
    unavailable,
    at,
    tablet,
  );
  assert.equal(refreshed.variants[0].prices.length, 0);
});

test('Xiaomi parser captures the exact main configuration and current price, never MRP or accessories', () => {
  const rows = parseXiaomiCatalog(
    card() +
      card('Xiaomi 17 Ultra Photography Kit Pro') +
      card('Xiaomi 17T 16 GB + 1024 GB Violet'),
    at,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].variant.specs.color, 'Violet');
  assert.equal(rows[0].variant.prices[0].local, 60000);
  assert.equal(rows[0].variant.prices[0].part, '456');
  assert.equal(rows[0].variant.prices[0].source, 'Xiaomi India');
  assert.equal(Date.parse(rows[0].variant.prices[0].expiresAt!), now + xiaomiFreshnessMs);
  assert.equal(rows[0].variant.prices[0].refundEligible, false);
});
test('out-of-stock cards retain configuration evidence without a purchasable price', () => {
  assert.equal(
    parseXiaomiCatalog(card(undefined, undefined, false), at)[0].variant.prices.length,
    0,
  );
  assert.throws(() => parseXiaomiCatalog('<html>Blocked</html>', at), /markup/);
  assert.throws(() => parseXiaomiCatalog(card(undefined, 'From ₹60,000'), at), /No verified/);
  assert.throws(
    () =>
      parseXiaomiCatalog(
        card().replace('data-disabled="false"', 'data-disabled="true"'),
        'bad-date',
      ),
    /observation time/,
  );
  assert.throws(
    () => parseXiaomiCatalog(card().replace('data-disabled="false"', 'data-disabled="true"'), at),
    /No verified/,
  );
});
test('refresh preserves unobserved variants until expiry and keeps selectors meaningful', () => {
  const collected = updateXiaomiProduct(reference, parseXiaomiCatalog(card(), at), at);
  assert.equal(collected.defaultVariant, '12gb-256gb-violet');
  const target = selectConfiguration(collected, collected.defaultVariant, 'storage', '512GB')!;
  assert.ok(target);
  assert.ok(
    changedDimensions(
      collected,
      collected.variants.find((variant) => variant.id === collected.defaultVariant)!,
      target,
      'storage',
    ).every((change) => typeof change.label === 'string'),
  );
  const removed = updateXiaomiProduct(reference, [], '2026-11-01T12:00:00Z', collected);
  assert.ok(removed.variants.some((variant) => variant.id === '12gb-256gb-violet'));
  assert.equal(removed.pricedAt, collected.pricedAt);
  assert.equal(
    removed.variants.find((variant) => variant.id === '12gb-256gb-violet')?.prices[0].at,
    at,
  );
  const outOfStock = updateXiaomiProduct(
    reference,
    parseXiaomiCatalog(card(undefined, undefined, false), '2026-11-01T12:00:00Z'),
    '2026-11-01T12:00:00Z',
    collected,
  );
  assert.equal(
    outOfStock.variants.find((variant) => variant.id === '12gb-256gb-violet')?.prices.length,
    0,
  );
  const ranked = rankPrices(
    {
      prices: collected.variants.find((variant) => variant.id === collected.defaultVariant)!.prices,
    },
    storeByCode,
    { INR: 80 },
    { now },
  );
  assert.equal(ranked.length, 1);
  assert.equal(
    rankPrices({ prices: ranked }, storeByCode, { INR: 80 }, { now: now + xiaomiFreshnessMs })
      .length,
    0,
  );
});

test('collecting after pending catalog publication keeps the exact priced phone color reachable', () => {
  const collected = updateXiaomiProduct(reference, parseXiaomiCatalog(card(), at), at, reference);
  assert.ok(collected.dimensions.some((dimension) => dimension.key === 'color'));
  const larger = selectConfiguration(collected, collected.defaultVariant, 'storage', '512GB')!;
  assert.equal(larger.specs.color, 'unspecified');
  const smaller = selectConfiguration(collected, larger.id, 'storage', '256GB')!;
  assert.equal(smaller.specs.color, 'unspecified');
  const priced = selectConfiguration(collected, smaller.id, 'color', 'Violet')!;
  assert.equal(priced.id, collected.defaultVariant);
  assert.equal(collected.variants.find((variant) => variant.id === priced.id)?.prices[0].at, at);
});
test('partial malformed catalog preserves last observation for the affected model', () => {
  const collected = updateXiaomiProduct(reference, parseXiaomiCatalog(card(), at), at);
  const partial = parseXiaomiCatalog(
    card('Xiaomi 17 Ultra 16 GB + 512 GB White') +
      card().replace('class="actions"', 'class="changed-markup"'),
    '2026-11-01T12:00:00Z',
  );
  const retained = updateXiaomiProduct(reference, partial, '2026-11-01T12:00:00Z', collected);
  assert.equal(retained.pricedAt, at);
  assert.equal(
    retained.variants.find((variant) => variant.id === '12gb-256gb-violet')?.prices[0].at,
    at,
  );
  assert.deepEqual(retained.failedStores, ['in']);
});

test('fresh main-card color becomes default while older cheaper color retains its expiry', () => {
  const previous = updateXiaomiProduct(reference, parseXiaomiCatalog(card(), at), at);
  const checked = '2026-11-01T12:00:00Z';
  const updated = updateXiaomiProduct(
    reference,
    parseXiaomiCatalog(card('Xiaomi 17T 12 GB + 256 GB White', '₹65,000'), checked),
    checked,
    previous,
  );
  assert.equal(updated.defaultVariant, '12gb-256gb-white');
  assert.equal(
    updated.variants.find((variant) => variant.id === '12gb-256gb-violet')?.prices[0].at,
    at,
  );
  assert.equal(
    updated.variants.find((variant) => variant.id === updated.defaultVariant)?.prices[0].at,
    checked,
  );
});

test('Android publication preserves Apple data; source failure does not manufacture newer observations', async () => {
  const data = new Map<string, unknown>([
    ['index', { ready: true, products: [productSummary(product)] }],
    [`product-${product.id}`, product],
  ]);
  const storage: Storage = {
    read: async (key) => data.get(key) || null,
    write: async (key, value) => {
      data.set(key, value);
    },
  };
  const result = await collectAndroid(storage, (async () => new Response(card())) as typeof fetch);
  assert.equal(result.offers, 1);
  assert.equal(data.get(`product-${product.id}`), product);
  const saved = data.get('product-xiaomi-17t') as Product;
  await assert.rejects(
    collectAndroid(storage, (async () => new Response('blocked', { status: 403 })) as typeof fetch),
    /403/,
  );
  await publishAndroidCatalog(storage);
  assert.equal((data.get('product-xiaomi-17t') as Product).pricedAt, saved.pricedAt);
  assert.equal(
    (data.get('index') as Listing).products.find((summary) => summary.id === product.id)
      ?.prices?.[0].local,
    product.variants[0].prices[0].local,
  );
});
