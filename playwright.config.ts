import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 120000,
  use: {
    headless: false,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  retries: 1,
  reporter: [['list']],
  webServer: {
    command: 'npx vite --port 5199',
    port: 5199,
    reuseExistingServer: true,
    timeout: 10000,
  },
});
