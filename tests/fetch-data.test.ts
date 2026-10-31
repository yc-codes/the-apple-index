import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyPublished, emptyData } from '../scripts/fetch-data';
import { families } from '../server/families';
import { researchedProducts } from '../server/products';

test('missing data produces every pending family without rates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'apple-empty-'));
  try {
    await emptyData(directory);
    const listing = JSON.parse(await readFile(join(directory, 'index.json'), 'utf8'));
    assert.equal(listing.ready, false);
    assert.deepEqual(
      listing.products.map((p: { id: string }) => p.id),
      [...families, ...researchedProducts].map((f) => f.id),
    );
    assert.ok(
      listing.products.slice(0, families.length).every((p: { ready: boolean }) => !p.ready),
    );
    assert.ok(
      listing.products
        .slice(families.length)
        .every((p: { ready: boolean; prices: unknown[] }) => p.ready && !p.prices.length),
    );
    assert.deepEqual(await readdir(directory), ['index.json']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('migration copies only published JSON and removes stale destination data', async () => {
  const root = await mkdtemp(join(tmpdir(), 'apple-copy-'));
  try {
    const destination = join(root, 'published');
    await emptyData(destination);
    await writeFile(join(destination, 'product-old.json'), '{}');
    await writeFile(join(root, 'product-test.json'), '{}');
    await writeFile(join(root, 'catalog-test.json'), '{}');
    await copyPublished(root, destination);
    assert.deepEqual((await readdir(destination)).sort(), ['index.json', 'product-test.json']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
