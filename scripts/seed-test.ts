import { createStorage } from '../server/storage.js';
import { product, listing, rates } from '../tests/fixtures.js';
const storage = createStorage({ token: '', production: false, directory: '.cache/browser-test' });
await storage.write('product-macbook-pro', product);
await storage.write('index', listing);
await storage.write('rates', rates);
