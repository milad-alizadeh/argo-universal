import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import type { AppOptions, ServerOptions } from './fixtures';
import { findFreePort } from './own-server';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
// A free port per run, so runs in several worktrees never meet; workers inherit it from the runner, which loads this file first.
process.env.ARGO_E2E_WEB_PORT ??= String(await findFreePort());
const webPort = process.env.ARGO_E2E_WEB_PORT;
const webUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig<AppOptions & ServerOptions>({
  // Specs live in one folder per flow, e2e/<flow>/ (AGENTS.md).
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // A test that passes only on retry is a flake: it fails the run on CI, with its trace.
  failOnFlakyTests: !!process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  // Never open the report server, so `pnpm test:e2e` ends on failure too.
  reporter: [['html', { open: 'never' }]],
  use: {
    // The Server binds 127.0.0.1 only, so the App is served there too (spec section 5).
    baseURL: webUrl,

    trace: 'retain-on-first-failure',
  },

  projects: [
    // The Expo web export in Chromium, against each test's own Server (spec section 10).
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

  // The web export; each test starts a real Server of its own, and e2e tests mock only the Agent CLI (AGENTS.md).
  webServer: [
    {
      name: 'Web',
      command: `pnpm --filter @repo/universal-app exec expo serve --port ${webPort}`,
      url: webUrl,
      cwd: repositoryRoot,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
  ],
});
