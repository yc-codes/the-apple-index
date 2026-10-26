import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStorage } from '../server/storage.js';
import { createDataReader } from '../server/data.js';
test('production fails closed without Blob credentials', async () => {
  const storage = createStorage({ production: true, token: '' });
  await assert.rejects(() => storage.read('index'), /BLOB_READ_WRITE_TOKEN/);
  await assert.rejects(() => storage.write('index', {}), /BLOB_READ_WRITE_TOKEN/);
});
test('development storage writes atomically and rejects path traversal', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'apple-index-test-'));
  try {
    const storage = createStorage({ production: false, token: '', directory });
    await storage.write('index', { ready: true });
    assert.deepEqual(await storage.read('index'), { ready: true });
    assert.equal(await storage.read('missing'), null);
    await assert.rejects(() => storage.read('../secret'), /Invalid/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('Blob reads and writes use private access and current content', async () => {
  let read, write;
  const storage = createStorage({
    production: true,
    token: 'test-token',
    blobGet: async (path, options) => {
      read = { path, options };
      return { statusCode: 200, stream: new Response('{"ready":true}').body };
    },
    blobPut: async (path, body, options) => {
      write = { path, body, options };
    },
  });
  assert.deepEqual(await storage.read('index'), { ready: true });
  await storage.write('index', { ready: false });
  assert.equal(read.path, 'apple-index/v1/index.json');
  assert.equal(read.options.access, 'private');
  assert.equal(read.options.useCache, false);
  assert.equal(write.options.allowOverwrite, true);
  assert.equal(write.options.access, 'private');
});
test('request reader returns pending products, refreshes storage, and preserves last good results', async () => {
  let calls = 0,
    at = 0,
    value = null,
    fail = false;
  const reader = createDataReader(
    {
      read: async () => {
        calls++;
        if (fail) throw Error('offline');
        return value;
      },
    },
    { now: () => at, maxAge: 10 },
  );
  assert.equal((await reader.product('macbook-pro')).status, 503);
  assert.equal((await reader.product('unknown')).status, 404);
  value = { id: 'macbook-pro' };
  at = 20;
  const results = await Promise.all([reader.product('macbook-pro'), reader.product('macbook-pro')]);
  assert.equal(calls, 2);
  assert.equal(results[0].status, 200);
  fail = true;
  at = 40;
  assert.deepEqual((await reader.product('macbook-pro')).body, value);
});
