// Production uses private Vercel Blob. Disk is a development cache only.
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { get, put } from '@vercel/blob';
import type { Storage } from './types';
type StorageOptions = {
  token?: string;
  production?: boolean;
  directory?: string;
  blobGet?: (
    ...args: Parameters<typeof get>
  ) => Promise<{ statusCode: number; stream: ReadableStream<Uint8Array> | null } | null>;
  blobPut?: (...args: Parameters<typeof put>) => Promise<unknown>;
};

export function createStorage({
  token = process.env.BLOB_READ_WRITE_TOKEN,
  production = Boolean(process.env.VERCEL),
  directory = resolve(process.env.DATA_CACHE_DIR || '.cache'),
  blobGet = get,
  blobPut = put,
}: StorageOptions = {}): Storage {
  const pathname = (key: string) => {
    if (!/^[a-z0-9-]+$/.test(key)) throw new Error('Invalid storage key');
    return `apple-index/v1/${key}.json`;
  };
  const requireStorage = () => {
    if (production && !token) throw new Error('BLOB_READ_WRITE_TOKEN is required on Vercel');
  };
  return {
    async read(key) {
      const path = pathname(key);
      requireStorage();
      if (token) {
        const result = await blobGet(path, {
          access: 'private',
          token,
          useCache: false,
          abortSignal: AbortSignal.timeout(15000),
        });
        return result?.statusCode === 200 ? new Response(result.stream).json() : null;
      }
      try {
        return JSON.parse(await readFile(join(directory, key + '.json'), 'utf8'));
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
        throw error;
      }
    },
    async write(key, value) {
      const path = pathname(key);
      requireStorage();
      const body = JSON.stringify(value);
      if (token) {
        await blobPut(path, body, {
          access: 'private',
          token,
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: 'application/json',
          cacheControlMaxAge: 60,
        });
        return;
      }
      await mkdir(directory, { recursive: true });
      const file = join(directory, key + '.json'),
        temporary = file + '.' + crypto.randomUUID() + '.tmp';
      await writeFile(temporary, body);
      await rename(temporary, file);
    },
  };
}
export const storage = createStorage();
