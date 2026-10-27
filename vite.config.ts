import { readdirSync, readFileSync, existsSync } from 'node:fs';
import type { Product } from './src/types';
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';

const pages = [{ path: '/' }];
if (existsSync('data')) {
  for (const file of readdirSync('data').sort()) {
    if (!/^product-[a-z0-9-]+\.json$/.test(file)) continue;
    const product: Product = JSON.parse(readFileSync(`data/${file}`, 'utf8'));
    pages.push({ path: `/products/${product.id}` });
    for (const variant of product.variants)
      pages.push({ path: `/products/${product.id}/${variant.id}` });
  }
}

export default defineConfig({
  server: { port: 5173, host: '0.0.0.0' },
  plugins: [
    tanstackStart({ pages, prerender: { enabled: true, crawlLinks: true, failOnError: true } }),
    nitro({ preset: process.env.VERCEL ? 'vercel' : 'bun' }),
    react(),
  ],
});
