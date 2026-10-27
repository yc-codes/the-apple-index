import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStorage } from '../server/storage.ts';
test('storage routes published files and checkpoints and rejects traversal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'apple-index-test-'));
  const directory = join(root, 'cache'),
    publishDirectory = join(root, 'data');
  try {
    const storage = createStorage({ directory, publishDirectory });
    const published = ['index', 'rates', 'collector-status', 'product-macbook-pro'];
    const checkpoints = [
      'catalog-macbook-pro',
      'prices-macbook-pro',
      'store-us',
      'page-123',
      'regional-us',
    ];
    for (const key of [...published, ...checkpoints]) {
      await storage.write(key, { ready: true });
      assert.deepEqual(await storage.read(key), { ready: true });
    }
    assert.deepEqual(
      (await readdir(publishDirectory)).sort(),
      published.map((k) => k + '.json').sort(),
    );
    assert.deepEqual((await readdir(directory)).sort(), checkpoints.map((k) => k + '.json').sort());
    assert.equal(
      await readFile(join(publishDirectory, 'index.json'), 'utf8'),
      '{\n  "ready": true\n}\n',
    );
    assert.equal(await storage.read('missing'), null);
    await assert.rejects(() => storage.read('../secret'), /Invalid/);
    await assert.rejects(() => storage.write('../secret', {}), /Invalid/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
