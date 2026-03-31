import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@village/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
