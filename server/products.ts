import type { Product } from '../src/types';
import { families } from './families';
import { researchedPhones } from './phones';
import { researchedProduct, validateProductIds, type DeviceManifest } from './researched';
import laptops from './catalog/laptops.json';
import tablets from './catalog/tablets.json';
import related from './catalog/related.json';

export const researchedProducts: Product[] = [
  ...researchedPhones,
  ...([...laptops, ...tablets, ...related] as DeviceManifest[]).map(researchedProduct),
];
export const researchedProductById: Record<string, Product | undefined> = Object.fromEntries(
  researchedProducts.map((product) => [product.id, product]),
);
// Apple collection families stay separate from the category-neutral product registry.
export const registeredProducts = [
  ...families.map(({ id, name, category }) => ({ id, name, category, brand: 'Apple' })),
  ...researchedProducts.map(({ id, name, category, brand }) => ({ id, name, category, brand })),
];
validateProductIds(registeredProducts);
