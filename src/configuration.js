/** @typedef {import('./types').Product} Product */
/** @typedef {import('./types').Variant} Variant */
// Configuration selection over Apple's own dimensions (size, chip, memory, color…).
// Every option resolves to a configuration Apple actually sells; nothing is guessed from URLs.
/** @param {Product} product @param {string} id */
export const variantById = (product, id) => product.variants.find((v) => v.id === id);

// Pick the real configuration with `key=value` that keeps the most of the current selection.
// Ties keep the earlier (more fundamental) dimensions first, so a size change keeps chip/memory before color.
/** @param {Product} product @param {string} currentId @param {string} key @param {string} value */
export function selectConfiguration(product, currentId, key, value) {
  const current = variantById(product, currentId)?.specs || {};
  const order = product.dimensions.map((d) => d.key);
  const cost = (v) =>
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
/** @param {Product} product @param {Variant} from @param {Variant} to @param {string} except */
export function changedDimensions(product, from, to, except) {
  return product.dimensions
    .filter((d) => d.key !== except && from.specs[d.key] !== to.specs[d.key])
    .map((d) => ({ name: d.name, label: to.labels[d.key] }));
}
// Everything the selector needs: for each option, the configuration it leads to and what else changes.
/** @param {Product} product @param {string} currentId */
export function configurationOptions(product, currentId) {
  const current = variantById(product, currentId);
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
