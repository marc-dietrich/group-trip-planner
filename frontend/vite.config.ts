import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isGhPages = process.env.GITHUB_PAGES === 'true'
const base = isGhPages ? '/group-trip-planner/' : '/'

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    globals: true,
  },
})