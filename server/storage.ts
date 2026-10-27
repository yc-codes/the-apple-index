import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import type { Storage } from './types';

export function createStorage({
  directory = resolve(process.env.DATA_CACHE_DIR || '.cache'),
  publishDirectory = resolve(process.env.DATA_PUBLISH_DIR || 'data'),
}: {
  directory?: string;
  publishDirectory?: string;
} = {}): Storage {
  const location = (key: string) => {
    if (!/^[a-z0-9-]+$/.test(key)) throw new Error('Invalid storage key');
    const published =
      ['index', 'rates', 'collector-status'].includes(key) || key.startsWith('product-');
    return { directory: published ? publishDirectory : directory, published };
  };
  return {
    async read(key) {
      const { directory } = location(key);
      try {
        return JSON.parse(await readFile(join(directory, key + '.json'), 'utf8'));
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
        throw error;
      }
    },
    async write(key, value) {
      const { directory, published } = location(key);
      const body = published ? JSON.stringify(value, null, 2) + '\n' : JSON.stringify(value);
      await mkdir(directory, { recursive: true });
      const file = join(directory, key + '.json'),
        temporary = file + '.' + crypto.randomUUID() + '.tmp';
      await writeFile(temporary, body);
      await rename(temporary, file);
    },
  };
}
export const storage = createStorage();
