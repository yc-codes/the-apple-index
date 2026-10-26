import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';

export default defineConfig({
  server: { port: 5173, host: '0.0.0.0' },
  plugins: [tanstackStart(), nitro({ preset: process.env.VERCEL ? 'vercel' : 'bun' }), react()],
});
