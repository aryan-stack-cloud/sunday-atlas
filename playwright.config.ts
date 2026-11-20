import { defineConfig } from '@playwright/test'

export const operatorKey = 'sunday-atlas-isolated-browser-test-key'
export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.ts',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4190',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: 'node server/index.mjs',
    url: 'http://127.0.0.1:4190/api/state',
    env: { PORT: '4190', ATLAS_DB: ':memory:', ATLAS_SAMPLE: '1', ATLAS_ADMIN_KEY: operatorKey },
  },
})
