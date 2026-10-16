import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { findFreePort } from '@repo/mocks/network/free-port';
import { defineBddConfig } from 'playwright-bdd';
import { z } from 'zod';
import type { AppOptions, ServerOptions } from './fixtures';

// CI splits the web suite across runners, as `ARGO_E2E_SHARD=1/3`; it is an env variable so turbo caches each shard apart.
const ShardNumber = z.coerce.number().int().min(1);

const parseShard = (
  value: string | undefined,
): { current: number; total: number } | null => {
  if (value === undefined) return null;
  const [current, total] = value.split('/');

  return {
    current: ShardNumber.parse(current),
    total: ShardNumber.parse(total),
  };
};

const shard = parseShard(process.env.ARGO_E2E_SHARD);

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
  globalSetup: './engine-bundle.ts',
  fullyParallel: true,
  shard,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // A test that passes only on retry is a flake: it fails the run on CI, with its trace.
  failOnFlakyTests: !!process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  // A shard writes a blob report that CI merges into one HTML report; never open the report server, so `pnpm test:e2e` ends on failure too.
  reporter: shard ? [['blob'], ['list']] : [['html', { open: 'never' }]],
  use: {
    // The Server binds 127.0.0.1 only, so the App is served there too.
    baseURL: webUrl,

    trace: 'retain-on-first-failure',
  },

  projects: [
    // The Expo web export in Chromium, against each test's own Server; scenarios set their own Frame, so phone width is proven here too (Spec 0011).
    {
      name: 'web',
      use: { ...devices['Desktop Chrome'], appTarget: 'web' },
    },
    // The desktop App in production mode connects to its fixture Engine; it runs the smoke scenarios only (ADR 0011).
    {
      name: 'electron',
      grep: /@smoke/,
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
