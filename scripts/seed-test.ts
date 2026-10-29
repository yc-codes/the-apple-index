import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createStorage } from '../server/storage.ts';
import { product, comparisonProduct, listing, rates } from '../tests/fixtures.ts';
const publishDirectory = process.env.DATA_PUBLISH_DIR || 'data';
for (const file of await readdir(publishDirectory).catch(() => [])) {
  if (file.endsWith('.json')) await rm(join(publishDirectory, file));
}
const storage = createStorage({ publishDirectory });
await storage.write('product-macbook-pro', product);
await storage.write(`product-${comparisonProduct.id}`, comparisonProduct);
await storage.write('index', listing);
await storage.write('rates', rates);
