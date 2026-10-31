import { test } from 'node:test';
import assert from 'node:assert/strict';
import { researchedProduct, validateProductIds, type DeviceManifest } from '../server/researched';
import { researchedProductById, researchedProducts, registeredProducts } from '../server/products';
import { researchedPhones } from '../server/phones';
import { productCategories, productCategory } from '../src/brand';
import { selectConfiguration } from '../src/configuration';
import laptops from '../server/catalog/laptops.json';

const reference = (): DeviceManifest => structuredClone(laptops[0]) as unknown as DeviceManifest;

test('the expanded registry preserves all 17 original phone URLs and adds exact researched categories', () => {
  assert.deepEqual(
    researchedPhones.map((product) => product.id),
    [
      'samsung-galaxy-s26',
      'samsung-galaxy-s26-plus',
      'samsung-galaxy-s26-ultra',
      'samsung-galaxy-z-fold8',
      'samsung-galaxy-z-flip8',
      'samsung-galaxy-a57-5g',
      'oneplus-15',
      'oneplus-15r',
      'oneplus-nord-6',
      'oneplus-nord-ce6',
      'xiaomi-17-ultra',
      'xiaomi-17t',
      'redmi-note-15-pro-plus-5g',
      'redmi-note-17-pro-5g',
      'redmi-note-17-pro-max-5g',
      'redmi-note-17-5g',
      'poco-x8-pro',
    ],
  );
  const count = (category: string) =>
    researchedProducts.filter((product) => product.category === category).length;
  assert.equal(count('Laptops'), 8);
  assert.equal(count('Tablets'), 6);
  assert.equal(count('Audio'), 4);
  assert.equal(count('Watches'), 1);
  assert.equal(count('Gaming'), 3);
  assert.equal(
    new Set(registeredProducts.map((product) => product.id)).size,
    registeredProducts.length,
  );
  for (const product of researchedProducts.filter((product) => product.category === 'Laptops')) {
    assert.deepEqual(Object.keys(product.variants[0].specs).sort(), [
      'chip',
      'gpu',
      'memory',
      'size',
      'storage',
    ]);
    assert.ok(product.fixed.Processor && product.fixed.Graphics && product.fixed.Market);
  }
  for (const product of researchedProducts.filter((product) =>
    ['Audio', 'Watches', 'Gaming'].includes(product.category),
  )) {
    assert.equal(product.variants[0].specs.memory, undefined);
    if (product.category !== 'Gaming') assert.equal(product.variants[0].specs.storage, undefined);
  }
});

test('category-specific identity is retained without redundant selectors or invented combinations', () => {
  const manifest = reference();
  const base = manifest.configurations[0];
  manifest.configurations.push({
    ...base,
    id: 'upgraded',
    label: 'Upgraded',
    specs: { ...base.specs, memory: '32GB LPDDR5X', gpu: 'Another verified GPU' },
  });
  const product = researchedProduct(manifest);
  assert.deepEqual(
    product.dimensions.map((dimension) => dimension.key),
    ['memory', 'gpu'],
  );
  assert.equal(product.fixed.Processor, base.specs.chip);
  assert.equal(product.fixed.Market, 'United States');
  assert.equal(product.variants.length, 2);
  assert.equal(
    selectConfiguration(product, base.id, 'memory', '32GB LPDDR5X')?.specs.gpu,
    'Another verified GPU',
  );
  assert.equal(researchedProductById['redmi-pad-2-pro']?.variants[0].specs.connectivity, 'Wi-Fi');
  assert.equal(
    researchedProductById['redmi-pad-2-pro-5g']?.variants[0].specs.connectivity,
    'Wi-Fi + 5G',
  );
});

test('manifest validation rejects ambiguous configurations, conflicting facts and cross-market provenance', () => {
  const regional = reference();
  regional.sources[0].market = 'in';
  assert.throws(() => researchedProduct(regional), /regional sources/);
  const incomplete = reference();
  delete incomplete.configurations[0].specs.gpu;
  assert.throws(() => researchedProduct(incomplete), /complete configuration/);
  const repeated = reference();
  repeated.configurations.push({ ...repeated.configurations[0], id: 'duplicate' });
  assert.throws(() => researchedProduct(repeated), /duplicate configuration/);
  const conflicting = reference();
  conflicting.fixed.Graphics = 'Unrelated GPU';
  assert.throws(() => researchedProduct(conflicting), /conflicting Graphics/);
  const wrongMarket = reference();
  wrongMarket.fixed.Market = 'India';
  assert.throws(() => researchedProduct(wrongMarket), /conflicting Market/);
  assert.throws(() => validateProductIds([{ id: 'same' }, { id: 'same' }]), /globally unique/);
});

test('category navigation keeps legacy Apple URLs and reveals new or unknown categories', () => {
  assert.equal(productCategory({ id: 'macbook-pro', category: 'Mac' }), 'Laptops');
  assert.equal(productCategory({ id: 'mac-mini', category: 'Mac' }), 'Computers');
  assert.equal(productCategory({ id: 'studio-display', category: 'Mac' }), 'Displays');
  const categories = productCategories([
    ...registeredProducts,
    { id: 'future', category: 'Cameras' },
  ]);
  for (const category of [
    'Laptops',
    'Computers',
    'Phones',
    'Tablets',
    'Audio',
    'Watches',
    'Gaming',
    'Displays',
    'Cameras',
  ])
    assert.ok(categories.includes(category));
  assert.equal(categories[0], 'All products');
});
