import { defineConfig, devices } from '@playwright/test'

/**
 * E2E smoke tests. Integration specs that need a live Supabase project are
 * skipped automatically unless E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD
 * (and optionally E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD) are set.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
