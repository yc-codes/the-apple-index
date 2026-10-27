import type { Family } from './types.ts';
// Product family identifiers and Apple store paths; prices are collected separately.
export const families: Family[] = [
  ['macbook-air', 'MacBook Air', 'Mac', 'buy-mac/macbook-air'],
  ['macbook-neo', 'MacBook Neo', 'Mac', 'buy-mac/macbook-neo'],
  ['macbook-pro', 'MacBook Pro', 'Mac', 'buy-mac/macbook-pro'],
  ['imac', 'iMac', 'Mac', 'buy-mac/imac'],
  ['mac-mini', 'Mac mini', 'Mac', 'buy-mac/mac-mini'],
  ['mac-studio', 'Mac Studio', 'Mac', 'buy-mac/mac-studio'],
  ['studio-display', 'Studio Display', 'Mac', 'buy-mac/studio-display'],
  ['studio-display-xdr', 'Studio Display XDR', 'Mac', 'buy-mac/studio-display-xdr'],
  ['iphone-18-pro', 'iPhone 18 Pro', 'iPhone', 'buy-iphone/iphone-18-pro'],
  ['iphone-air', 'iPhone Air', 'iPhone', 'buy-iphone/iphone-air'],
  ['iphone-duo', 'iPhone Duo', 'iPhone', 'buy-iphone/iphone-duo'],
  ['iphone-17', 'iPhone 17', 'iPhone', 'buy-iphone/iphone-17'],
  ['iphone-17e', 'iPhone 17e', 'iPhone', 'buy-iphone/iphone-17e'],
  ['iphone-16', 'iPhone 16', 'iPhone', 'buy-iphone/iphone-16'],
  ['ipad-pro', 'iPad Pro', 'iPad', 'buy-ipad/ipad-pro'],
  ['ipad-air', 'iPad Air', 'iPad', 'buy-ipad/ipad-air'],
  ['ipad', 'iPad', 'iPad', 'buy-ipad/ipad'],
  ['ipad-mini', 'iPad mini', 'iPad', 'buy-ipad/ipad-mini'],
  ['apple-watch', 'Apple Watch Series 12', 'Watch', 'buy-watch/apple-watch'],
  ['apple-watch-se', 'Apple Watch SE', 'Watch', 'buy-watch/apple-watch-se'],
  ['apple-watch-ultra', 'Apple Watch Ultra', 'Watch', 'buy-watch/apple-watch-ultra'],
  ['apple-tv-4k', 'Apple TV 4K', 'TV & Home', 'buy-tv/apple-tv-4k'],
  ['homepod', 'HomePod', 'TV & Home', 'buy-homepod/homepod'],
  ['homepod-mini', 'HomePod mini', 'TV & Home', 'buy-homepod/homepod-mini'],
].map(([id, name, category, path]) => ({ id, name, category, path }));
export const familyById: Record<string, Family | undefined> = Object.fromEntries(
  families.map((f) => [f.id, f]),
);
// Apple's store share images, shown until (or if) a collected configuration image is available.
const art = (name: string) =>
  `https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/${name}`;
export const artwork: Record<string, string> = {
  'macbook-air': art(
    'macbook-air-size-unselect-202601-gallery-1?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1767638925491',
  ),
  'macbook-neo': art(
    'macbook-neo-color-unselect-202603-gallery-1?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1771560008657',
  ),
  'macbook-pro': art(
    'mac-macbook-pro-size-unselect-202601-gallery-1?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1767812220981',
  ),
  imac: art(
    'imac-color-unselect-202601-gallery-1?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1767917121718',
  ),
  'mac-mini': art(
    'mac-mini-chip-unselect-202608-gallery-1?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1785998455498',
  ),
  'mac-studio': art(
    'mac-studio-chip-unselect-202608-gallery-1?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1786042910172',
  ),
  'studio-display': art(
    'studio-display-og-202603?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1770765709335',
  ),
  'studio-display-xdr': art(
    'studio-display-xdr-og-202603?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1770765683015',
  ),
  'iphone-18-pro': art(
    'iphone-18-pro-model-unselect-gallery-1-202609?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1786041739689',
  ),
  'iphone-air': art(
    'iphone-air-finish-unselect-gallery-1-202509?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1757665392198',
  ),
  'iphone-duo': art(
    'iphone-duo-finish-unselect-gallery-2-202609?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1788026660137',
  ),
  'iphone-17': art(
    'iphone-17-finish-unselect-gallery-1-202509_GEO_US?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1758739981140',
  ),
  'iphone-17e': art(
    'iphone-17e-finish-unselect-gallery-1-202603_GEO_US?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1770766619353',
  ),
  'iphone-16': art(
    'iphone-16-finish-select-202409-6-1inch_GEO_US?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1724710494447',
  ),
  'ipad-pro': art(
    'ipad-pro-model-select-gallery-1-202405?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1713495958512',
  ),
  'ipad-air': art(
    'ipad-air-model-unselect-gallery-1-202405?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1739381939396',
  ),
  ipad: art(
    'ipad-model-unselect-gallery-1-202503?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1739318772336',
  ),
  'ipad-mini': art(
    'ipad-mini-finish-unselect-gallery-1-202610?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1791933043916',
  ),
  'apple-watch': art(
    's12-case-unselect-gallery-1-202609?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1788867936144',
  ),
  'apple-watch-se': art(
    'se-case-unselect-gallery-1-202609?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1786074163493',
  ),
  'apple-watch-ultra': art(
    'ultra-case-unselect-gallery-1-202609?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1787876542337',
  ),
  'apple-tv-4k': art(
    'apple-tv-4k-hero-select-202610?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1790131173589',
  ),
  homepod: art('homepod-og-202301?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1670391082906'),
  'homepod-mini': art(
    'homepod-mini-og-image-202610?wid=1200&hei=630&fmt=jpeg&qlt=95&.v=1790352758848',
  ),
};
