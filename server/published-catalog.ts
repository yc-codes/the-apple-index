import type { Listing, Product, Summary } from '../src/types';
import type { Storage } from './types';
import { mergeListing, productSummary } from '../src/catalog-data';
import { families } from './families';
import { researchedProducts } from './products';

export async function publishResearchedCatalog(storage: Storage, updates: Product[] = []) {
  const prior = (await storage.read('index')) as Listing | null;
  const updated = new Map(updates.map((product) => [product.id, product]));
  const summaries: Summary[] = [];
  for (const reference of researchedProducts) {
    const previous = (await storage.read(`product-${reference.id}`)) as Product | null;
    const product = updated.get(reference.id) || previous || reference;
    await storage.write(`product-${reference.id}`, product);
    summaries.push(productSummary(product));
  }
  const ids = new Set(summaries.map((summary) => summary.id));
  const baseline =
    prior?.products ||
    families.map(({ id, name, category }) => ({
      id,
      name,
      category,
      brand: 'Apple',
      ready: false,
    }));
  const products = [...baseline.filter((summary) => !ids.has(summary.id)), ...summaries];
  await storage.write('index', mergeListing({ ready: false, products }));
}
