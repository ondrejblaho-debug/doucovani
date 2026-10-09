import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
export default defineConfig({
  base: process.env.BASE || '/doucovani/',
  plugins: [preact()],
  build: { outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 2000 },
  server: { host: '0.0.0.0' },
});
