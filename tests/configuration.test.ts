import type { ConfigurableProduct, SelectionVariant } from '../src/configuration';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectConfiguration, configurationOptions } from '../src/configuration.ts';
// Shaped like /api/products/macbook-pro: dimensions + real configurations only.
const v = (
  id: string,
  size: string,
  chip: string,
  memory: string,
  storage: string,
  color: string,
): SelectionVariant => ({
  id,
  specs: { size, chip, memory, storage, color },
  labels: { size, chip, memory, storage, color },
});
const product: ConfigurableProduct = {
  dimensions: [
    ['size', 'Size'],
    ['chip', 'Chip'],
    ['memory', 'Memory'],
    ['storage', 'Storage'],
    ['color', 'Color'],
  ].map(([key, name]) => ({ key, name, values: [] })),
  variants: [
    v('14-max-36-2tb-silver', '14-inch', 'M5 Max', '36GB', '2TB', 'Silver'),
    v('14-max-36-2tb-black', '14-inch', 'M5 Max', '36GB', '2TB', 'Space Black'),
    v('16-max-36-2tb-silver', '16-inch', 'M5 Max', '36GB', '2TB', 'Silver'),
    v('16-max-48-2tb-black', '16-inch', 'M5 Max', '48GB', '2TB', 'Space Black'),
    v('16-pro-24-1tb-black', '16-inch', 'M5 Pro', '24GB', '1TB', 'Space Black'),
    v('14-m5-16-1tb-silver', '14-inch', 'M5', '16GB', '1TB', 'Silver'),
  ],
};
for (const d of product.dimensions)
  d.values = [...new Set(product.variants.map((x) => x.specs[d.key]))].map((key) => ({
    key,
    label: key,
  }));
test('changing color keeps every hardware spec when Apple sells that combination', () => {
  const next = selectConfiguration(product, '14-max-36-2tb-silver', 'color', 'Space Black');
  assert.equal(next.id, '14-max-36-2tb-black');
});
test('changing size keeps chip, memory and storage before color', () => {
  assert.equal(
    selectConfiguration(product, '14-max-36-2tb-black', 'size', '16-inch').id,
    '16-max-36-2tb-silver',
  );
});
test('every option leads to a real configuration and reports what else changes', () => {
  for (const current of product.variants)
    for (const group of configurationOptions(product, current.id))
      for (const option of group.values) {
        const target = product.variants.find((x) => x.id === option.target);
        if (!target) {
          assert.equal(group.key, 'color');
          assert.equal(option.target, undefined);
          continue;
        }
        assert.ok(target);
        assert.equal(target.specs[group.key], option.key);
        if (option.selected) assert.equal(target.id, current.id);
        const changed = product.dimensions
          .filter((d) => d.key !== group.key && target.specs[d.key] !== current.specs[d.key])
          .map((d) => d.name);
        assert.deepEqual(
          option.changes.map((c) => c.name),
          changed,
        );
      }
});

test('color never substitutes different hardware when the exact color is missing', () => {
  assert.equal(
    selectConfiguration(product, '16-max-36-2tb-silver', 'color', 'Space Black'),
    undefined,
  );
});
