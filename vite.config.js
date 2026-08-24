import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist'
  },
  esbuild: {
    // Force treat all .js files as ESM modules
    format: 'esm'
  },
  optimizeDeps: {
    include: ['ethers']
  }
})
