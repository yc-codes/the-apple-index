// Deliberately small, synthetic prices for repeatable tests; never shipped as production data.
const stamp = '2026-10-26T00:00:00.000Z';
const makeVariant = (color, memory = '36GB') => ({
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
export const product = {
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
export const listing = {
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
  ],
};
export const rates = {
  at: Date.now(),
  value: { base: 'USD', updated: stamp, rates: { USD: 1, INR: 84, JPY: 150, EUR: 0.9, GBP: 0.8 } },
};
