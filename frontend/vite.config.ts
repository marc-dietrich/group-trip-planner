import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

const isGhPages = process.env.GITHUB_PAGES === 'true'
const base = isGhPages ? '/group-trip-planner/' : '/'

const resolveCommit = () => {
  if (process.env.VITE_BUILD_COMMIT) return process.env.VITE_BUILD_COMMIT
  try {
    return execSync('git rev-parse HEAD').toString().trim()
  } catch {
    return ''
  }
}

const commit = resolveCommit()
const shortCommit = commit ? commit.slice(0, 7) : ''

if (!process.env.VITE_BUILD_COMMIT && commit) {
  process.env.VITE_BUILD_COMMIT = commit
}
if (!process.env.VITE_BUILD_LABEL && shortCommit) {
  process.env.VITE_BUILD_LABEL = shortCommit
}

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
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'tests/e2e/**', '.git'],
  },
})