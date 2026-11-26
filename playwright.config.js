const fs = require('fs');
const os = require('os');
const path = require('path');
const { defineConfig, firefox } = require('@playwright/test');

function resolveFirefoxLaunchOptions() {
  try {
    const defaultExecutable = firefox.executablePath();
    if (defaultExecutable && fs.existsSync(defaultExecutable)) {
      return {};
    }
  } catch (_) {
    // Fall back to scanning local Playwright cache directories.
  }

  const cacheRoots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), '.cache', 'ms-playwright'),
  ].filter(Boolean);

  for (const root of cacheRoots) {
    if (!fs.existsSync(root)) continue;
    const candidates = fs
      .readdirSync(root)
      .filter((name) => name.startsWith('firefox-'))
      .sort()
      .reverse();
    for (const dir of candidates) {
      const bin = path.join(root, dir, 'firefox', 'firefox');
      if (fs.existsSync(bin)) {
        return { executablePath: bin };
      }
    }
  }
  return {};
}

module.exports = defineConfig({
  testDir: './tests',
  testMatch: 'e2e.test.js',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5500',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:5500/home',
    reuseExistingServer: true,
    timeout: 15000,
  },
  projects: [
    {
      name: 'firefox',
      use: {
        browserName: 'firefox',
        launchOptions: resolveFirefoxLaunchOptions(),
      },
    },
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
