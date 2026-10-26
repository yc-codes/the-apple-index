import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCache } from '../server/cache.ts';
import { discoverFamily } from '../server/catalog.ts';
test('concurrent cold reads share one refresh and await durable storage', async () => {
  let reads = 0,
    loads = 0,
    written = false;
  const cache = createCache({
    read: async () => {
      reads++;
      return null;
    },
    write: async () => {
      written = true;
    },
  });
  const loader = async () => {
    loads++;
    return { price: 123 };
  };
  const values = await Promise.all([
    cache.get('price', 1000, loader),
    cache.get('price', 1000, loader),
  ]);
  assert.equal(reads, 1);
  assert.equal(loads, 1);
  assert.equal(written, true);
  assert.deepEqual(values[0], { price: 123 });
});
test('failed refresh and failed persistence retain the last good entry', async () => {
  const cache = createCache(
    {
      read: async () => ({ at: 1, value: 'old' }),
      write: async () => {
        throw Error('storage failed');
      },
    },
    { now: () => 100 },
  );
  await assert.rejects(
    () =>
      cache.get('price', 1, async () => {
        throw Error('Apple unavailable');
      }),
    /Apple unavailable/,
  );
  assert.equal(cache.peek('price'), 'old');
  await assert.rejects(() => cache.get('price', 1, async () => 'new'), /storage failed/);
  assert.equal(cache.peek('price'), 'old');
});
test('Mac discovery rejects an incomplete configuration list instead of publishing a smaller catalog', async () => {
  const html =
    '<div class="item"><a href="https://www.apple.com/shop/buy-mac/macbook-pro/silver"><div class="details">MacBook Pro, 14-inch, Silver</div></a></div>';
  await assert.rejects(
    () =>
      discoverFamily(
        { id: 'macbook-pro', name: 'MacBook Pro', category: 'Mac', path: 'buy-mac/macbook-pro' },
        { fetchPage: async () => html, pageCache: async () => null },
      ),
    /Incomplete configuration/,
  );
});
