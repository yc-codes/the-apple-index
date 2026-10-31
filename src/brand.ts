export const site = {
  name: 'The Device Index',
  tagline: 'Global tech prices, compared.',
  title: 'The Device Index — Global tech prices, compared.',
  description:
    'Explore Apple, Samsung, OnePlus and Xiaomi devices. Compare collected regional prices for the same configuration in your currency.',
  preferencesKey: 'device-index-preferences',
};

// Legacy Apple snapshots retain their category labels and URLs during the expansion.
export function productCategory(product: { id: string; category: string }) {
  if (product.category === 'Mac') return product.id.includes('display') ? 'Displays' : 'Computers';
  return (
    { iPhone: 'Phones', iPad: 'Tablets', Watch: 'Watches' }[product.category] || product.category
  );
}
