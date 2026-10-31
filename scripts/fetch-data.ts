import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { families } from '../server/families';
import { mergeListing } from '../src/catalog-data';

export async function emptyData(directory: string) {
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, 'index.json'),
    JSON.stringify(
      mergeListing({
        ready: false,
        products: families.map(({ id, name, category }) => ({ id, name, category, ready: false })),
      }),
      null,
      2,
    ) + '\n',
  );
}
export async function copyPublished(source: string, destination: string) {
  const files = (await readdir(source)).filter((file) =>
    /^(index|rates|collector-status|product-[a-z0-9-]+)\.json$/.test(file),
  );
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const file of files) await cp(join(source, file), join(destination, file));
  if (!files.includes('index.json')) await emptyData(destination);
  console.log(`Fetched ${files.filter((file) => file.startsWith('product-')).length} products.`);
}
export async function fetchData() {
  const directory = resolve('data');
  const from = process.argv.find((arg) => arg.startsWith('--from='))?.slice(7);
  if (from) {
    if (resolve(from) === directory) throw new Error('Source and destination must differ');
    await copyPublished(resolve(from), directory);
    return;
  }
  if (
    process.env.DATA_SOURCE === 'local' ||
    (!process.env.VERCEL && existsSync(join(directory, 'index.json')))
  ) {
    if (!existsSync(join(directory, 'index.json'))) await emptyData(directory);
    console.log('Using local published data.');
    return;
  }
  const owner = process.env.VERCEL_GIT_REPO_OWNER || 'yc-codes';
  const repo = process.env.VERCEL_GIT_REPO_SLUG || 'the-apple-index';
  const temporary = await mkdtemp(join(tmpdir(), 'apple-data-'));
  try {
    const source = join(temporary, 'data');
    const result = spawnSync(
      'git',
      [
        'clone',
        '--depth',
        '1',
        '--branch',
        'data',
        `https://github.com/${owner}/${repo}.git`,
        source,
      ],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
      if (!/Remote branch data not found/.test(result.stderr || ''))
        throw new Error(result.stderr || result.error?.message || 'Data clone failed');
      await rm(directory, { recursive: true, force: true });
      await emptyData(directory);
      console.log('Data branch does not exist yet. Fetched 0 products.');
      return;
    }
    await copyPublished(source, directory);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
if (import.meta.main) await fetchData();
