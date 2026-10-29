import type { Product, Variant, Listing } from '../src/types';
import type { CacheEntry, ExchangeRates } from '../server/types';
// Deliberately small, synthetic prices for repeatable tests; never shipped as production data.
const stamp = '2026-10-26T00:00:00.000Z';
const makeVariant = (color: string, memory = '36GB'): Variant => ({
  id: `14-inch-max-${memory.toLowerCase()}-2tb-${color.toLowerCase()}`,
  part: `TEST${color}`,
  specs: { size: '14-inch', chip: 'M5 Max', memory, storage: '2TB', color },
  labels: { size: '14-inch', chip: 'M5 Max', memory, storage: '2TB', color },
  label: `14-inch · M5 Max · ${memory} · 2TB · ${color}`,
  image: 'https://images.example.test/' + color + '.png',
  prices: [
    {
      code: 'us',
      local: 3000,
      display: '$3,000',
      at: stamp,
      url: 'https://www.apple.com/shop/buy-mac/macbook-pro',
    },
    {
      code: 'in',
      local: 350000,
      display: '₹350,000',
      at: stamp,
      url: 'https://www.apple.com/in/shop/buy-mac/macbook-pro',
    },
    {
      code: 'jp',
      local: 420000,
      display: '¥420,000',
      at: stamp,
      url: 'https://www.apple.com/jp/shop/buy-mac/macbook-pro',
    },
  ],
});
const variants = [makeVariant('Silver'), makeVariant('Black'), makeVariant('Silver', '48GB')];
export const product: Product = {
  id: 'macbook-pro',
  name: 'MacBook Pro',
  category: 'Mac',
  variants,
  dimensions: [
    {
      key: 'memory',
      name: 'Memory',
      values: [
        { key: '36GB', label: '36GB' },
        { key: '48GB', label: '48GB' },
      ],
    },
    {
      key: 'color',
      name: 'Color',
      values: [
        { key: 'Silver', label: 'Silver' },
        { key: 'Black', label: 'Black' },
      ],
    },
  ],
  fixed: { Size: '14-inch', Chip: 'M5 Max', Storage: '2TB' },
  defaultVariant: variants[0].id,
  pricedAt: stamp,
  failedStores: [],
};
// A second priced family exercises deal navigation and category transitions.
export const comparisonProduct: Product = {
  ...product,
  id: 'iphone-18-pro',
  name: 'iPhone 18 Pro Max',
  category: 'iPhone',
};
export const listing: Listing = {
  ready: false,
  products: [
    {
      id: product.id,
      name: product.name,
      category: 'Mac',
      ready: true,
      image: variants[0].image,
      variant: { id: variants[0].id, label: variants[0].label },
      prices: variants[0].prices,
      configurations: 3,
      pricedAt: stamp,
    },
    { id: 'ipad-pro', name: 'iPad Pro', category: 'iPad', ready: false },
    {
      id: comparisonProduct.id,
      name: comparisonProduct.name,
      category: comparisonProduct.category,
      ready: true,
      image: variants[0].image,
      variant: { id: variants[0].id, label: variants[0].label },
      prices: variants[0].prices,
      configurations: 3,
      pricedAt: stamp,
    },
  ],
};
export const rates: CacheEntry<ExchangeRates> = {
  at: Date.now(),
  value: {
    base: 'USD',
    source: 'https://rates.example.test',
    updated: stamp,
    rates: { USD: 1, INR: 84, JPY: 150, EUR: 0.9, GBP: 0.8 },
  },
};
