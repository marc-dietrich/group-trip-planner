import { defineConfig } from '@playwright/test'

const baseURL = process.env.BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL,
  },
  webServer: {
    command: 'npm run dev -- --host 0.0.0.0 --port 3000',
    url: `${baseURL}/__dialog-sandbox`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
