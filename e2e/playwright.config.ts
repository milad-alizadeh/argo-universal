import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import type { AppOptions } from './fixtures';

const repositoryRoot = path.resolve(import.meta.dirname, '..');

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<AppOptions>({
  // Specs live in one folder per flow, e2e/<flow>/ (AGENTS.md).
  testDir: '.',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  // Never open the report server, so `pnpm test:e2e` ends on failure too.
  reporter: [['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // The Server binds 127.0.0.1 only, so the App is served there too (spec section 5).
    baseURL: 'http://127.0.0.1:8081',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    // The Expo web export in Chromium, against the Server below (spec section 10).
    {
      name: 'web',
      use: { ...devices['Desktop Chrome'], appTarget: 'web' },
    },
    // The desktop app in production mode; it starts its own Server (spec section 9).
    {
      name: 'electron',
      use: { appTarget: 'electron' },
    },
  ],

  /* Run your local dev server before starting the tests */
  // A real Server and the web export; e2e tests mock only the Agent CLI (AGENTS.md).
  webServer: [
    {
      name: 'Server',
      // The supervisor as desktop starts it; pnpm would report SIGTERM as a failure.
      command: 'node --import tsx src/main.ts',
      // The web export has the default Server URL, ws://127.0.0.1:7337, built in (spec section 8).
      url: 'http://127.0.0.1:7337/health',
      cwd: path.join(repositoryRoot, 'apps/server'),
      // Playwright empties test-results before it starts web servers, so each run gets a fresh home.
      env: {
        ARGO_HOME: path.join(import.meta.dirname, 'test-results', 'server-home'),
      },
      // Never reuse a dev Server, which runs on the owner's ~/.argo.
      reuseExistingServer: false,
      // SIGTERM lets the supervisor stop the worker and remove server.json (spec section 5).
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
    {
      name: 'Web',
      command: 'pnpm --filter @repo/universal-app exec expo serve --port 8081',
      url: 'http://127.0.0.1:8081',
      cwd: repositoryRoot,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
  ],
});
