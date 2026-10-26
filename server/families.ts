import type { Family } from './types';
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
