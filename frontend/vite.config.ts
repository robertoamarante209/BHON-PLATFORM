import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/auth': {
        target: 'http://localhost:3000',
        rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
      },
      '/auth': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
    },
  },
});

