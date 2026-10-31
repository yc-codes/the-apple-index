import type { Product } from '../src/types.ts';
import { families } from './families.ts';

type Device = {
  id: string;
  name: string;
  brand: string;
  configurations: [number, number][];
  url: string;
  market?: string;
  image?: string;
};

// Curated manufacturer evidence, checked 2026-10-31. See docs/research/android-catalog-2026-10-31.md.
// These are actual memory/storage pairs, not a Cartesian product of every advertised option.
const devices: Device[] = [
  {
    id: 'samsung-galaxy-s26',
    name: 'Galaxy S26',
    brand: 'Samsung',
    configurations: [
      [12, 256],
      [12, 512],
    ],
    url: 'https://www.samsung.com/in/smartphones/galaxy-s26/buy/',
  },
  {
    id: 'samsung-galaxy-s26-plus',
    name: 'Galaxy S26+',
    brand: 'Samsung',
    configurations: [
      [12, 256],
      [12, 512],
    ],
    url: 'https://www.samsung.com/in/smartphones/galaxy-s26/buy/',
  },
  {
    id: 'samsung-galaxy-s26-ultra',
    name: 'Galaxy S26 Ultra',
    brand: 'Samsung',
    configurations: [
      [12, 256],
      [12, 512],
      [16, 1024],
    ],
    url: 'https://www.samsung.com/in/smartphones/galaxy-s26-ultra/buy/',
  },
  {
    id: 'samsung-galaxy-z-fold8',
    name: 'Galaxy Z Fold8',
    brand: 'Samsung',
    configurations: [
      [12, 256],
      [12, 512],
      [16, 1024],
    ],
    url: 'https://www.samsung.com/in/smartphones/galaxy-z-fold8/buy/',
  },
  {
    id: 'samsung-galaxy-z-flip8',
    name: 'Galaxy Z Flip8',
    brand: 'Samsung',
    configurations: [
      [12, 256],
      [12, 512],
    ],
    url: 'https://www.samsung.com/in/smartphones/galaxy-z-flip8/buy/',
  },
  {
    id: 'samsung-galaxy-a57-5g',
    name: 'Galaxy A57 5G',
    brand: 'Samsung',
    configurations: [
      [8, 256],
      [12, 256],
    ],
    url: 'https://www.samsung.com/in/smartphones/galaxy-a57/buy/',
  },
  {
    id: 'oneplus-15',
    name: 'OnePlus 15',
    brand: 'OnePlus',
    configurations: [
      [12, 256],
      [16, 512],
    ],
    url: 'https://www.oneplus.in/15/specs',
    image: 'https://www.oneplus.in/content/dam/oneplus/2026/in/nav/OP15-sand.png',
  },
  {
    id: 'oneplus-15r',
    name: 'OnePlus 15R',
    brand: 'OnePlus',
    configurations: [
      [12, 256],
      [12, 512],
    ],
    url: 'https://www.oneplus.in/15r/specs',
    image: 'https://www.oneplus.in/content/dam/oneplus/2026/in/nav/OP15R-Mint-Breeze.png',
  },
  {
    id: 'oneplus-nord-6',
    name: 'OnePlus Nord 6',
    brand: 'OnePlus',
    configurations: [
      [8, 256],
      [12, 256],
    ],
    url: 'https://www.oneplus.in/nord-6/specs',
    image:
      'https://www.oneplus.in/content/dam/oneplus/2026/product-station/oneplus-nord-6/nav/OnePlus_VW_Mint_296x296.png',
  },
  {
    id: 'oneplus-nord-ce6',
    name: 'OnePlus Nord CE6',
    brand: 'OnePlus',
    configurations: [
      [8, 128],
      [8, 256],
    ],
    url: 'https://www.oneplus.in/nord-ce6/specs',
    image:
      'https://www.oneplus.in/content/dam/oneplus/2026/product-station/oneplus-nord-ce6/others/OnePlus_Prado_Mint_296x296_new.png',
  },
  {
    id: 'xiaomi-17-ultra',
    name: 'Xiaomi 17 Ultra',
    brand: 'Xiaomi',
    configurations: [[16, 512]],
    url: 'https://www.mi.com/in/product/xiaomi-17-ultra/specs/',
  },
  {
    id: 'xiaomi-17t',
    name: 'Xiaomi 17T',
    brand: 'Xiaomi',
    configurations: [
      [12, 256],
      [12, 512],
    ],
    url: 'https://www.mi.com/in/product/xiaomi-17t/specs/',
  },
  {
    id: 'redmi-note-15-pro-plus-5g',
    name: 'Redmi Note 15 Pro+ 5G',
    brand: 'Xiaomi',
    configurations: [
      [8, 256],
      [12, 256],
      [12, 512],
    ],
    url: 'https://www.mi.com/in/product/redmi-note-15-pro-plus-5g/specs/',
  },
  {
    id: 'redmi-note-17-pro-5g',
    name: 'REDMI Note 17 Pro 5G',
    brand: 'Xiaomi',
    configurations: [
      [8, 128],
      [8, 256],
    ],
    url: 'https://www.mi.com/in/product/redmi-note-17-pro-5g/specs/',
  },
  {
    id: 'redmi-note-17-pro-max-5g',
    name: 'REDMI Note 17 Pro Max 5G',
    brand: 'Xiaomi',
    configurations: [
      [8, 256],
      [12, 256],
    ],
    url: 'https://store.mi.com/in/products/448-0-0-0-0-1',
  },
  {
    id: 'redmi-note-17-5g',
    name: 'REDMI Note 17 5G',
    brand: 'Xiaomi',
    configurations: [
      [6, 128],
      [8, 128],
    ],
    url: 'https://store.mi.com/in/products/448-0-0-0-0-1',
  },
  {
    id: 'poco-x8-pro',
    name: 'POCO X8 Pro',
    brand: 'POCO',
    configurations: [
      [8, 256],
      [8, 512],
      [12, 512],
    ],
    url: 'https://www.mi.com/ae-en/product/poco-x8-pro/specs/',
    market: 'ae',
    image:
      'https://i02.appmifile.com/332_operator_sg/06/03/2026/0ad119ed645050b492d6f231af016dd8.png',
  },
];

const capacity = (value: number) => (value === 1024 ? '1TB' : `${value}GB`);
export const researchedProducts: Product[] = devices.map((device) => {
  const market = device.market || 'in';
  const variants = device.configurations.map(([memory, storage]) => ({
    id: `${memory}gb-${storage}gb`,
    label: `${memory}GB RAM · ${capacity(storage)} storage`,
    specs: { memory: `${memory}GB`, storage: capacity(storage) },
    labels: { memory: `${memory}GB RAM`, storage: capacity(storage) },
    prices: [],
  }));
  return {
    id: device.id,
    name: device.name,
    category: 'Phones',
    brand: device.brand,
    image: device.image || null,
    variants,
    dimensions: (['memory', 'storage'] as const).map((key) => ({
      key,
      name: key === 'memory' ? 'RAM' : 'Storage',
      values: [
        ...new Map(
          variants.map((variant) => [
            variant.specs[key],
            { key: variant.specs[key], label: variant.labels[key] },
          ]),
        ).values(),
      ],
    })),
    fixed: { Market: market === 'in' ? 'India' : 'UAE' },
    defaultVariant: variants[0].id,
    pricedAt: '',
    failedStores: [],
    research: {
      checkedAt: '2026-10-31',
      sources: [
        {
          label: `${device.brand} official ${market === 'in' ? 'India' : 'UAE'} specifications`,
          url: device.url,
          market,
        },
        ...(device.brand === 'Xiaomi' && !device.url.includes('store.mi.com')
          ? [
              {
                label: 'Xiaomi India store',
                url: 'https://store.mi.com/in/products/448-0-0-0-0-1',
                market: 'in',
              },
            ]
          : []),
      ],
      note: `${market === 'in' ? 'India-market' : 'UAE-market'} RAM and storage combinations verified from the manufacturer. Regional availability and warranty may differ. Reference configurations do not specify a color; collected offers identify their exact color separately.`,
    },
  };
});
export const researchedProductById: Record<string, Product | undefined> = Object.fromEntries(
  researchedProducts.map((product) => [product.id, product]),
);
// The generic product registry is intentionally separate from Apple collection families.
export const registeredProducts = [
  ...families.map(({ id, name, category }) => ({ id, name, category, brand: 'Apple' })),
  ...researchedProducts.map(({ id, name, category, brand }) => ({ id, name, category, brand })),
];
