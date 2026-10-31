import { load } from 'cheerio';
import type { Product, Variant } from '../src/types';
import { researchedProducts } from './products';
import { eligiblePrice } from '../src/price-state';

export const xiaomiCatalogUrl = 'https://store.mi.com/in/products/448-0-0-0-0-1';
export const xiaomiFreshnessMs = 36 * 60 * 60 * 1000;
const xiaomiModels = researchedProducts
  .filter((product) => product.brand === 'Xiaomi')
  .sort((a, b) => b.name.length - a.name.length);
export type XiaomiObservation = { productId: string; variant: Variant };
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Observed public catalog markup, not an API: docs/research/android-catalog-2026-10-31.md.
// Only the main card states availability explicitly. Thumbnail is_cos flags are not interpreted.
export function parseXiaomiCatalog(html: string, observedAt: string): XiaomiObservation[] {
  if (!Number.isFinite(Date.parse(observedAt))) throw new Error('Invalid observation time');
  const $ = load(html);
  if (!$('.goods-item').length) throw new Error('Xiaomi catalog markup unavailable');
  const observations: XiaomiObservation[] = [];
  $('.goods-item').each((_, element) => {
    const card = $(element);
    const title = card.find('h2.title a').first().text().replace(/\s+/g, ' ').trim();
    const model = xiaomiModels.find((product) =>
      title.toLowerCase().startsWith(product.name.toLowerCase() + ' '),
    );
    if (!model) return;
    const description = title.slice(model.name.length).trim();
    const hardware = description.match(/\b(\d+)\s*GB\s*\+\s*(\d+)\s*(GB|TB)\b/i);
    if (!hardware) return; // An accessory named after a phone is not a phone configuration.
    const memory = `${Number(hardware[1])}GB`;
    const storage = `${Number(hardware[2])}${hardware[3].toUpperCase()}`;
    if (
      !model.variants.some(
        (variant) => variant.specs.memory === memory && variant.specs.storage === storage,
      )
    )
      return;
    const color = description.replace(hardware[0], '').trim();
    if (!color || !/^[\p{L}\p{N} -]+$/u.test(color)) return;
    const url = card.find('h2.title a').attr('href')?.trim();
    if (!url || !/^https:\/\/store\.mi\.com\/in\/item\/\d+$/.test(url)) return;
    const priceElement = card.find('.price').first().clone();
    priceElement.find('del').remove();
    const display = priceElement.text().trim();
    if (!/^₹\s*\d[\d,]*(?:\.\d{1,2})?$/.test(display)) return;
    const value = Number(display.replace(/[₹,\s]/g, ''));
    if (!Number.isFinite(value) || value <= 0 || value > 2_000_000) return;
    const cart = card.find('.actions .J_buyGoods');
    const available = cart.attr('data-disabled') === 'false' && /ADD TO CART/i.test(cart.text());
    if (!available && !/OUT OF STOCK/i.test(card.find('.actions').text())) return;
    const sku = cart.attr('data-gid') || url.split('/').at(-1)!;
    const imageUrl = card.find('.figure img').attr('src');
    const image = imageUrl && /^https:\/\/i\d+\.appmifile\.com\//.test(imageUrl) ? imageUrl : null;
    observations.push({
      productId: model.id,
      variant: {
        id: `${slug(memory)}-${slug(storage)}-${slug(color)}`,
        part: sku,
        label: `${memory} RAM · ${storage} storage · ${color}`,
        specs: { memory, storage, color },
        labels: { memory: `${memory} RAM`, storage, color },
        image,
        prices: available
          ? [
              {
                code: 'in',
                local: value,
                display,
                part: sku,
                url,
                at: observedAt,
                source: 'Xiaomi India',
                availability: 'in-stock',
                refundEligible: false,
                expiresAt: new Date(Date.parse(observedAt) + xiaomiFreshnessMs).toISOString(),
              },
            ]
          : [],
      },
    });
  });
  if (!observations.length)
    throw new Error('No verified phone configurations found in Xiaomi catalog');
  return observations;
}

export function updateXiaomiProduct(
  reference: Product,
  observations: XiaomiObservation[],
  observedAt: string,
  previous?: Product | null,
): Product {
  const matched = observations.filter((row) => row.productId === reference.id);
  if (!matched.length) return previous ? { ...previous, failedStores: ['in'] } : reference;
  // The catalog shows one main card per model. Unobserved colors may still be available:
  // retain their original timestamps/expiry; only explicit observations replace an offer.
  const variants = new Map<string, Variant>(
    (previous?.variants || []).map((variant) => [variant.id, variant]),
  );
  for (const variant of reference.variants)
    variants.set(variant.id, {
      ...variant,
      specs: { ...variant.specs, color: 'unspecified' },
      labels: { ...variant.labels, color: 'Not specified' },
    });
  for (const observation of matched) variants.set(observation.variant.id, observation.variant);
  const current = [...variants.values()];
  // Prefer a just-observed offer for the default summary, so older retained colors cannot
  // expire ahead of it and conceal the fresh observation in a lightweight listing snapshot.
  const candidates = matched.some(({ variant }) =>
    variant.prices.some((price) => eligiblePrice(price, Date.parse(observedAt))),
  )
    ? matched.map(({ variant }) => variant)
    : current;
  const best = candidates
    .filter((variant) =>
      variant.prices.some((price) => eligiblePrice(price, Date.parse(observedAt))),
    )
    .sort((a, b) => a.prices[0].local - b.prices[0].local)[0];
  const colors = [
    ...new Set(current.flatMap((variant) => (variant.specs.color ? [variant.specs.color] : []))),
  ];
  return {
    ...reference,
    image: best?.image || previous?.image || reference.image,
    variants: current,
    dimensions: [
      ...reference.dimensions,
      ...(colors.length
        ? [
            {
              key: 'color',
              name: 'Color',
              values: colors.map((color) => ({
                key: color,
                label: color === 'unspecified' ? 'Not specified' : color,
              })),
            },
          ]
        : []),
    ],
    defaultVariant: best?.id || reference.defaultVariant,
    pricedAt: observedAt,
    failedStores: [],
  };
}
