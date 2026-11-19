import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const target = 'http://localhost:4317'
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': target,
      '/files': target,
      '/ws': { target, ws: true },
    },
  },
  build: { outDir: 'dist' },
})
