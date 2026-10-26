// One refresh per key, awaited durable writes, and no lost last-good value on errors.
export function createCache(storage, { now = Date.now } = {}) {
  const entries = new Map(),
    reads = new Map();
  async function load(key) {
    if (entries.has(key)) return entries.get(key);
    if (reads.has(key)) return reads.get(key);
    const task = storage
      .read(key)
      .then((value) => {
        const entry = value || {};
        entries.set(key, entry);
        return entry;
      })
      .finally(() => reads.delete(key));
    reads.set(key, task);
    return task;
  }
  return {
    load,
    peek: (key) => entries.get(key)?.value,
    invalidate: (key) => entries.set(key, {}),
    async get(key, maxAge, loader) {
      const entry = await load(key);
      if (entry.value !== undefined && now() - entry.at < maxAge) return entry.value;
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
