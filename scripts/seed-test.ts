import { createStorage } from '../server/storage.ts';
import { product, listing, rates } from '../tests/fixtures.ts';
const storage = createStorage({ token: '', production: false, directory: '.cache/browser-test' });
await storage.write('product-macbook-pro', product);
await storage.write('index', listing);
await storage.write('rates', rates);
