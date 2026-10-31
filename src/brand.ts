export const site = {
  name: 'The Device Index',
  tagline: 'Global tech prices, compared.',
  title: 'The Device Index — Global tech prices, compared.',
  description:
    'Explore laptops, phones, tablets, audio, watches and gaming devices across brands. Compare collected regional prices for the same configuration in your currency.',
  preferencesKey: 'device-index-preferences',
};

// Legacy Apple snapshots retain their category labels and URLs during the expansion.
export function productCategory(product: { id: string; category: string }) {
  if (product.category === 'Mac') {
    if (product.id.startsWith('macbook-')) return 'Laptops';
    return product.id.includes('display') ? 'Displays' : 'Computers';
  }
  return (
    { iPhone: 'Phones', iPad: 'Tablets', Watch: 'Watches' }[product.category] || product.category
  );
}

const categoryOrder = [
  'Laptops',
  'Computers',
  'Phones',
  'Tablets',
  'Audio',
  'Watches',
  'Gaming',
  'Displays',
  'TV & Home',
];
export function productCategories(products: { id: string; category: string }[]) {
  const present = new Set(products.map(productCategory));
  return [
    'All products',
    ...categoryOrder.filter((category) => present.has(category)),
    ...[...present].filter((category) => !categoryOrder.includes(category)).sort(),
  ];
}
