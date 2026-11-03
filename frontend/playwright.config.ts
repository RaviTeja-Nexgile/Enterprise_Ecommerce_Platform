import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright runs the journeys saved in `e2e/` against the running app.
 * Start the app with `npm run dev` from the repository root first.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env['BASE_URL'] || `http://127.0.0.1:${process.env['PORT'] || 4200}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
