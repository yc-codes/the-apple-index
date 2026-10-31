import type { Product } from '../src/types';
import type { Storage } from './types';
import { researchedProducts } from './products';
import { parseXiaomiCatalog, updateXiaomiProduct, xiaomiCatalogUrl } from './xiaomi';
import { publishResearchedCatalog } from './published-catalog';

// Compatibility for existing callers; publication now covers every researched category.
export { publishResearchedCatalog as publishAndroidCatalog } from './published-catalog';

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
  for (const reference of researchedProducts.filter(
    (product) => product.brand === 'Xiaomi' && product.category === 'Phones',
  )) {
    const previous = (await storage.read(`product-${reference.id}`)) as Product | null;
    updates.push(updateXiaomiProduct(reference, observations, observedAt, previous));
  }
  await publishResearchedCatalog(storage, updates);
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
