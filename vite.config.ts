import { readdirSync, readFileSync, existsSync } from 'node:fs';
import type { Product } from './src/types.ts';
import { registeredProducts } from './server/products.ts';
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';

const pages = [
  { path: '/' },
  ...registeredProducts.map((product) => ({ path: `/products/${product.id}` })),
];
if (existsSync('data')) {
  for (const file of readdirSync('data').sort()) {
    if (!/^product-[a-z0-9-]+\.json$/.test(file)) continue;
    const product: Product = JSON.parse(readFileSync(`data/${file}`, 'utf8'));
    for (const variant of product.variants)
      pages.push({ path: `/products/${product.id}/${variant.id}` });
  }
}

export default defineConfig({
  define: {
    // Local-data builds (tests, DATA_SOURCE=local) must not read the live data branch.
    'import.meta.env.VITE_LIVE_DATA': JSON.stringify(process.env.DATA_SOURCE !== 'local'),
  },
  server: { port: 5173, host: '0.0.0.0' },
  plugins: [
    tanstackStart({
      pages,
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: true,
        filter: (page) => !page.path.includes('?'),
      },
    }),
    nitro({ preset: process.env.VERCEL ? 'vercel' : 'bun' }),
    react(),
  ],
});
