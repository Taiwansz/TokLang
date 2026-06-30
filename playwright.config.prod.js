const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/prod.e2e.test.js',
  timeout: 40000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-prod' }]],
  use: {
    baseURL:    'https://toklang-twn.vercel.app',
    headless:   true,
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
    video:      'off',
    actionTimeout: 15000,
  },
  outputDir: 'test-results/',
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
