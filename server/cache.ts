import type { CacheEntry, Storage } from './types';
// Keys bind each collector value to its type; unknown is confined to the persistence boundary.
export function createCache<Schema extends object = Record<string, unknown>>(
  storage: Storage,
  { now = Date.now } = {},
) {
  type Key = keyof Schema & string;
  const entries = new Map<Key, CacheEntry<unknown>>(),
    reads = new Map<Key, Promise<CacheEntry<unknown>>>();
  async function load<K extends Key>(key: K): Promise<CacheEntry<Schema[K]>> {
    const existing = entries.get(key);
    if (existing) return existing as CacheEntry<Schema[K]>;
    const pending = reads.get(key);
    if (pending) return pending as Promise<CacheEntry<Schema[K]>>;
    const task = storage
      .read(key)
      .then((value) => {
        const entry = (value || {}) as CacheEntry<Schema[K]>;
        entries.set(key, entry);
        return entry;
      })
      .finally(() => reads.delete(key));
    reads.set(key, task);
    return task;
  }
  return {
    load,
    peek: <K extends Key>(key: K) => entries.get(key)?.value as Schema[K] | undefined,
    invalidate: (key: Key) => {
      entries.set(key, {});
    },
    async get<K extends Key>(
      key: K,
      maxAge: number,
      loader: () => Promise<Schema[K]>,
    ): Promise<Schema[K]> {
      const entry = await load(key);
      if (entry.value !== undefined && entry.at !== undefined && now() - entry.at < maxAge)
        return entry.value;
      if (entry.pending) return entry.pending;
      entry.pending = (async () => {
        const value = await loader(),
          at = now();
        await storage.write(key, { value, at });
        Object.assign(entry, { value, at });
        return value;
      })().finally(() => {
        delete entry.pending;
      });
      return entry.pending;
    },
  };
}
