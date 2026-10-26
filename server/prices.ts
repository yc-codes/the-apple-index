// Live shelf prices from Apple's own regional product-price endpoint.
import { appleJson, AppleHttpError, storeUrl } from './apple.ts';
import { regionalParts, specSignature } from './catalog.ts';
import { record, text } from './json';
import type { AppleStore, Catalog, CatalogVariant, FamilyPrices, ShelfPrice } from './types';
const BATCH = 20;
async function priceBatch(store: string, parts: string[]): Promise<Record<string, ShelfPrice>> {
  if (!parts.length) return {};
  try {
    const data = record(
      await appleJson(storeUrl(store, 'shop/mcm/product-price?parts=' + parts.join(',')), {
        retries: parts.length > 1 ? 0 : 1,
      }),
    );
    if (!data.items || typeof data.items !== 'object' || Array.isArray(data.items))
      throw new Error('Unexpected Apple price response');
    const out: Record<string, ShelfPrice> = {};
    for (const [part, rawItem] of Object.entries(data.items)) {
      const item = record(rawItem),
        price = record(item.price),
        display = record(price.display);
      if (
        item.type !== 'UNKNOWN' &&
        typeof price.value === 'number' &&
        Number.isFinite(price.value) &&
        price.value > 0
      )
        out[part] = {
          value: price.value,
          display: text(display.actual) || text(display.smart) || null,
          name: text(item.name) || null,
        };
    }
    return out;
  } catch (error) {
    if (!(error instanceof AppleHttpError) || error.status !== 500) throw error;
    if (parts.length === 1) return {};
    const half = Math.ceil(parts.length / 2);
    return {
      ...(await priceBatch(store, parts.slice(0, half))),
      ...(await priceBatch(store, parts.slice(half))),
    };
  }
}
export async function storePrices(
  store: string,
  parts: string[],
): Promise<Record<string, ShelfPrice>> {
  const unique = [...new Set(parts)],
    chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += BATCH) chunks.push(unique.slice(i, i + BATCH));
  return Object.assign({}, ...(await Promise.all(chunks.map((chunk) => priceBatch(store, chunk)))));
}
export async function familyPrices(
  family: Catalog,
  store: AppleStore,
  {
    regional = () => regionalParts(family, store.store),
    candidates = new Map<string, Set<string>>(),
  }: {
    regional?: () => Promise<Record<string, string>>;
    candidates?: Map<string, Set<string>>;
  } = {},
): Promise<FamilyPrices> {
  const result: FamilyPrices = {};
  const attempt = async (pairs: { v: CatalogVariant; part: string }[]) => {
    const prices = await storePrices(
      store.store,
      pairs.map((x) => x.part),
    );
    for (const { v, part } of pairs)
      if (!result[v.id] && prices[part]) result[v.id] = { ...prices[part], part };
  };
  await attempt(family.variants.map((v) => ({ v, part: v.part })));
  const missing = () => family.variants.filter((v) => !result[v.id]);
  if (missing().length && !family.variants[0]?.name) {
    const before = missing().length;
    await attempt(
      missing().flatMap((v) =>
        [...(candidates.get(v.id) || [])]
          .filter((part) => part !== v.part)
          .map((part) => ({ v, part })),
      ),
    );
    if (missing().length > before / 2) {
      const parts = new Map(Object.entries(await regional()));
      await attempt(
        missing().flatMap((v) => {
          const part = parts.get(specSignature(v.specs));
          return part && part !== v.part ? [{ v, part }] : [];
        }),
      );
    }
  }
  for (const [id, price] of Object.entries(result)) {
    const parts = candidates.get(id) || new Set<string>();
    parts.add(price.part);
    candidates.set(id, parts);
  }
  return result;
}
