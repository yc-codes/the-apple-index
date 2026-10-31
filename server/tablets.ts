import type { Product } from '../src/types';
import type { Storage } from './types';
import { publishResearchedCatalog } from './published-catalog';
import {
  parseXiaomiTabletCatalog,
  updateXiaomiProduct,
  xiaomiTabletCatalogUrl,
  xiaomiTabletProducts,
} from './xiaomi';

export async function collectTablets(storage: Storage, fetcher: typeof fetch = fetch) {
  const response = await fetcher(xiaomiTabletCatalogUrl, {
    signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': 'TheDeviceIndex/1.0 (public product price research)' },
  });
  if (!response.ok) throw new Error(`Xiaomi India tablets HTTP ${response.status}`);
  const observedAt = new Date().toISOString();
  const observations = parseXiaomiTabletCatalog(await response.text(), observedAt);
  const updates: Product[] = [];
  for (const reference of xiaomiTabletProducts) {
    const previous = (await storage.read(`product-${reference.id}`)) as Product | null;
    updates.push(updateXiaomiProduct(reference, observations, observedAt, previous));
  }
  await publishResearchedCatalog(storage, updates);
  await storage.write('source-xiaomi-tablets-in', {
    observedAt,
    observations: observations.length,
    url: xiaomiTabletCatalogUrl,
  });
  return {
    products: updates.length,
    offers: observations.filter((observation) => observation.variant.prices.length).length,
    observedAt,
  };
}
