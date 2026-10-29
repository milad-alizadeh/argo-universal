import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { findFreePort } from '../../mocks/network/free-port.ts';

// Frame-rate runs against the production web export, the same build e2e serves.
const repositoryRoot = path.resolve(import.meta.dirname, '../..');

process.env.ARGO_PERF_WEB_PORT ??= String(await findFreePort());

const webPort = process.env.ARGO_PERF_WEB_PORT;

export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: '*.perf.mts',
  globalSetup: ['./browser-suite-lock.mts', '../../e2e/engine-bundle.ts'],
  outputDir: path.join(repositoryRoot, 'e2e/test-results/perf'),
  // One page at a time, so runs never share the CPU.
  workers: 1,
  fullyParallel: false,
  timeout: Number(process.env.PERF_TIMEOUT ?? 15 * 60_000),
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${webPort}`,
    headless: process.env.PERF_HEADED !== '1',
    actionTimeout: Number(process.env.PERF_READY_TIMEOUT ?? 10_000),
    reducedMotion: 'no-preference',
    screenshot: 'only-on-failure',
    launchOptions: {
      // Draw with the GPU, as a user's browser does, instead of software rasterising the glass.
      args: [
        '--enable-gpu',
        '--ignore-gpu-blocklist',
        '--enable-gpu-rasterization',
      ],
    },
  },
  webServer: {
    command: `pnpm --filter @repo/universal-app exec expo serve --port ${webPort}`,
    url: `http://127.0.0.1:${webPort}`,
    cwd: repositoryRoot,
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
  },
});
