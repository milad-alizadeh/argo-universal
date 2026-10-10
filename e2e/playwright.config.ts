import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import type { AppOptions, ServerOptions } from './fixtures';
import { findFreePort } from './server-port';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
// A free port per run, so runs in several worktrees never meet; workers inherit it from the runner, which loads this file first.
process.env.ARGO_E2E_WEB_PORT ??= String(await findFreePort());
const webPort = process.env.ARGO_E2E_WEB_PORT;
const webUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig<AppOptions & ServerOptions>({
  // Specs live in one folder per flow, e2e/<flow>/ (AGENTS.md).
  testDir: defineBddConfig({
    features: '**/*.feature',
    steps: 'steps/**/*.ts',
    outputDir: '.features-gen',
  }),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // A test that passes only on retry is a flake: it fails the run on CI, with its trace.
  failOnFlakyTests: !!process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  // Never open the report server, so `pnpm test:e2e` ends on failure too.
  reporter: [['html', { open: 'never' }]],
  use: {
    // The Server binds 127.0.0.1 only, so the App is served there too.
    baseURL: webUrl,

    trace: 'retain-on-first-failure',
  },

  projects: [
    // The Expo web export in Chromium, against each test's own Server.
    {
      name: 'web',
      use: { ...devices['Desktop Chrome'], appTarget: 'web' },
    },
    // The desktop App in production mode connects to its fixture Engine.
    {
      name: 'electron',
      grepInvert: /@web-only/,
      use: { appTarget: 'electron' },
    },
  ],

  // The web export; each App has a real Engine with shared external Agent fixtures.
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
