import type { PublishedSchema, StorageReader } from './types';
import type { Listing, Product, Meta } from '../src/types';
import { errorMessage } from './json';
type Key = keyof PublishedSchema & string;
// Read-only request path. A visitor never starts an Apple crawl or a background timer.
import { families, familyById } from './families.ts';
import { stores } from './stores.ts';
import { storage } from './storage.ts';
export function createDataReader(
  store: StorageReader = storage,
  { now = Date.now, maxAge = 30000 } = {},
) {
  const memory = new Map<Key, { value: unknown; at: number }>(),
    pending = new Map<Key, Promise<unknown>>();
  async function read<K extends Key>(key: K): Promise<PublishedSchema[K] | null> {
    const previous = memory.get(key);
    if (previous && now() - previous.at < maxAge) return previous.value as PublishedSchema[K];
    if (pending.has(key)) return pending.get(key) as Promise<PublishedSchema[K] | null>;
    const task = store
      .read(key)
      .then((value) => {
        memory.set(key, { value, at: now() });
        return value as PublishedSchema[K] | null;
      })
      .catch((error) => {
        if (previous?.value) {
          console.warn('[data] serving last result after storage failure');
          return previous.value as PublishedSchema[K];
        }
        throw error;
      })
      .finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  }
  return {
    async listing(): Promise<Listing> {
      return (
        (await read('index')) || {
          ready: false,
          products: families.map(({ id, name, category }) => ({
            id,
            name,
            category,
            ready: false,
          })),
        }
      );
    },
    async product(
      id: string,
    ): Promise<{ status: 200; body: Product } | { status: 404 | 503; body: { error: string } }> {
      if (!familyById[id]) return { status: 404, body: { error: 'Unknown product' } };
      const data = await read(`product-${id}`);
      return data
        ? { status: 200, body: data }
        : {
            status: 503,
            body: {
              error:
                'Prices for this product have not been collected yet. Please check again later.',
            },
          };
    },
    async meta(): Promise<Meta> {
      const rates = await read('rates');
      return {
        stores: stores.map(({ code, name, currency, tax }) => ({ code, name, currency, tax })),
        rates: rates?.value || null,
      };
    },
  };
}
export const reader = createDataReader();
export async function handleRequest(request: Request) {
  const { pathname } = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers: { Allow: 'GET, HEAD' } },
    );
  try {
    let status = 200,
      body: unknown;
    if (pathname === '/api/meta') {
      body = await reader.meta();
    } else if (pathname === '/api/products') {
      body = await reader.listing();
    } else {
      const match = pathname.match(/^\/api\/products\/([a-z0-9-]+)$/);
      if (!match) return Response.json({ error: 'Not found' }, { status: 404 });
      ({ status, body } = await reader.product(match[1]));
    }
    return new Response(request.method === 'HEAD' ? null : JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control':
          status === 200 ? 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' : 'no-store',
        ...(status === 503 ? { 'Retry-After': '60' } : {}),
      },
    });
  } catch (error) {
    console.error('[api] storage unavailable:', errorMessage(error));
    return Response.json(
      { error: 'Price data is temporarily unavailable. Please retry shortly.' },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } },
    );
  }
}
