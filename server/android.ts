import type { Listing, Product, Summary } from '../src/types';
import type { Storage } from './types';
import { mergeListing, productSummary } from '../src/catalog-data';
import { families } from './families';
import { researchedProducts } from './products';
import { parseXiaomiCatalog, updateXiaomiProduct, xiaomiCatalogUrl } from './xiaomi';

export async function publishAndroidCatalog(storage: Storage, updates: Product[] = []) {
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

export async function collectAndroid(storage: Storage, fetcher: typeof fetch = fetch) {
  const response = await fetcher(xiaomiCatalogUrl, {
    signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': 'TheDeviceIndex/1.0 (public product price research)' },
  });
  if (!response.ok) throw new Error(`Xiaomi India HTTP ${response.status}`);
  const html = await response.text();
  const observedAt = new Date().toISOString();
  const observations = parseXiaomiCatalog(html, observedAt);
  const updates: Product[] = [];
  for (const reference of researchedProducts.filter((product) => product.brand === 'Xiaomi')) {
    const previous = (await storage.read(`product-${reference.id}`)) as Product | null;
    updates.push(updateXiaomiProduct(reference, observations, observedAt, previous));
  }
  await publishAndroidCatalog(storage, updates);
  await storage.write('source-xiaomi-in', {
    observedAt,
    observations: observations.length,
    url: xiaomiCatalogUrl,
  });
  return {
    products: updates.length,
    offers: observations.filter((observation) => observation.variant.prices.length).length,
    observedAt,
  };
}
