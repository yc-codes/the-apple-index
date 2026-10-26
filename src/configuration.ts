import type { Dimension, Variant } from './types';
export type SelectionVariant = Pick<Variant, 'id' | 'specs' | 'labels'>;
export type ConfigurableProduct = { dimensions: Dimension[]; variants: SelectionVariant[] };
// Configuration selection over Apple's own dimensions (size, chip, memory, color…).
// Every option resolves to a configuration Apple actually sells; nothing is guessed from URLs.
export const variantById = (product: ConfigurableProduct, id: string) =>
  product.variants.find((v) => v.id === id);

// Pick the real configuration with `key=value` that keeps the most of the current selection.
// Ties keep the earlier (more fundamental) dimensions first, so a size change keeps chip/memory before color.
export function selectConfiguration(
  product: ConfigurableProduct,
  currentId: string,
  key: string,
  value: string,
) {
  const current = variantById(product, currentId)?.specs || {};
  const order = product.dimensions.map((d) => d.key);
  const cost = (v: SelectionVariant) =>
    order.reduce(
      (sum, k, i) =>
        k !== key && v.specs[k] !== current[k] ? sum + 1e3 + (order.length - i) : sum,
      0,
    );
  return product.variants
    .filter(
      (v) =>
        v.specs[key] === value &&
        (key !== 'color' ||
          Object.keys(current).every((k) => k === key || v.specs[k] === current[k])),
    )
    .sort((a, b) => cost(a) - cost(b))[0];
}
// Dimensions (other than the one clicked) that would change when moving from `from` to `to`.
export function changedDimensions(
  product: ConfigurableProduct,
  from: SelectionVariant,
  to: SelectionVariant,
  except: string,
) {
  return product.dimensions
    .filter((d) => d.key !== except && from.specs[d.key] !== to.specs[d.key])
    .map((d) => ({ name: d.name, label: to.labels[d.key] }));
}
// Everything the selector needs: for each option, the configuration it leads to and what else changes.
export function configurationOptions(product: ConfigurableProduct, currentId: string) {
  const current = variantById(product, currentId);
  if (!current) return [];
  return product.dimensions.map((dimension) => ({
    ...dimension,
    values: dimension.values.map((option) => {
      const target = selectConfiguration(product, currentId, dimension.key, option.key);
      return {
        ...option,
        selected: current.specs[dimension.key] === option.key,
        target: target?.id,
        changes: target ? changedDimensions(product, current, target, dimension.key) : [],
      };
    }),
  }));
}
