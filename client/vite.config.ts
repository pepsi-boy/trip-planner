import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/trips': 'http://localhost:3000',
      '/destinations': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});
