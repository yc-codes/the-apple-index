import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:5190', timezoneId: 'Asia/Kolkata', trace: 'retain-on-failure' },
  webServer: {
    command:
      'bun scripts/seed-test.ts && DATA_SOURCE=local bun run build && PORT=5190 bun run start',
    url: 'http://localhost:5190',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
