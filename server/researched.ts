import type { Product, Variant } from '../src/types';
import { stores } from './stores';

export type DeviceManifest = {
  id: string;
  name: string;
  brand: string;
  category: string;
  market: string;
  checkedAt: string;
  sources: { label: string; url: string; market: string }[];
  image?: string;
  fixed: Record<string, string>;
  dimensionNames: Record<string, string>;
  configurations: {
    id: string;
    label: string;
    specs: Record<string, string>;
    part?: string;
    image?: string;
  }[];
  note: string;
};

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid researched catalog: ${message}`);
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function https(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

// Explicit, researched configurations only. This never expands independent option lists
// into assumed combinations, and has no price input: observations come from collectors.
export function researchedProduct(device: DeviceManifest): Product {
  invariant(idPattern.test(device.id), 'product ID');
  invariant(text(device.name) && text(device.brand) && text(device.category), device.id);
  invariant(/^[a-z]{2}$/.test(device.market), `${device.id} market`);
  invariant(
    /^\d{4}-\d{2}-\d{2}$/.test(device.checkedAt) && Number.isFinite(Date.parse(device.checkedAt)),
    `${device.id} research date`,
  );
  invariant(
    device.sources.length &&
      device.sources.every(
        (source) => text(source.label) && https(source.url) && source.market === device.market,
      ),
    `${device.id} regional sources`,
  );
  invariant(!device.image || https(device.image), `${device.id} image`);
  invariant(text(device.note), `${device.id} research note`);
  invariant(Object.values(device.fixed).every(text), `${device.id} fixed specifications`);
  const keys = Object.keys(device.dimensionNames);
  invariant(
    keys.length && Object.values(device.dimensionNames).every(text),
    `${device.id} dimension labels`,
  );
  invariant(
    new Set(Object.values(device.dimensionNames)).size === keys.length,
    `${device.id} unique dimension labels`,
  );
  invariant(device.configurations.length, `${device.id} configurations`);
  const ids = new Set<string>();
  const signatures = new Set<string>();
  const variants: Variant[] = device.configurations.map((configuration) => {
    invariant(
      idPattern.test(configuration.id) && !ids.has(configuration.id),
      `${device.id} unique configuration ID`,
    );
    ids.add(configuration.id);
    invariant(text(configuration.label), `${device.id} configuration label`);
    invariant(
      Object.keys(configuration.specs).length === keys.length &&
        keys.every((key) => text(configuration.specs[key])),
      `${device.id} complete configuration specifications`,
    );
    const signature = JSON.stringify(keys.map((key) => configuration.specs[key]));
    invariant(!signatures.has(signature), `${device.id} duplicate configuration`);
    signatures.add(signature);
    invariant(
      !configuration.image || https(configuration.image),
      `${device.id} configuration image`,
    );
    return {
      ...configuration,
      specs: { ...configuration.specs },
      labels: { ...configuration.specs },
      prices: [],
    };
  });
  const dimensions = keys.map((key) => ({
    key,
    name: device.dimensionNames[key],
    values: [...new Set(variants.map((variant) => variant.specs[key]))].map((value) => ({
      key: value,
      label: value,
    })),
  }));
  const constants = Object.fromEntries(
    dimensions
      .filter((dimension) => dimension.values.length === 1)
      .map((dimension) => [dimension.name, dimension.values[0].label]),
  );
  const marketName = stores.find((store) => store.code === device.market)?.name;
  invariant(marketName, `${device.id} supported reference market`);
  for (const [name, value] of Object.entries({ ...constants, Market: marketName })) {
    invariant(
      !device.fixed[name] || device.fixed[name] === value,
      `${device.id} conflicting ${name}`,
    );
  }
  return {
    id: device.id,
    name: device.name,
    brand: device.brand,
    category: device.category,
    image: device.image || null,
    variants,
    dimensions: dimensions.filter((dimension) => dimension.values.length > 1),
    fixed: { ...constants, ...device.fixed, Market: marketName },
    defaultVariant: variants[0].id,
    pricedAt: '',
    failedStores: [],
    research: {
      checkedAt: device.checkedAt,
      sources: device.sources,
      note: device.note,
    },
  };
}

export function validateProductIds(products: { id: string }[]) {
  const ids = products.map((product) => product.id);
  invariant(new Set(ids).size === ids.length, 'product IDs must be globally unique');
}
