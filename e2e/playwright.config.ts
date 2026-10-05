import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import type { AppOptions } from './fixtures';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
// Beside the Server's home, so each run writes fresh mock Agent CLIs.
const mockAgentDirectory = path.join(
  import.meta.dirname,
  'test-results',
  'agent-bin',
);

export default defineConfig<AppOptions>({
  // Specs live in one folder per flow, e2e/<flow>/ (AGENTS.md).
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Never open the report server, so `pnpm test:e2e` ends on failure too.
  reporter: [['html', { open: 'never' }]],
  use: {
    // The Server binds 127.0.0.1 only, so the App is served there too (spec section 5).
    baseURL: 'http://127.0.0.1:8081',

    trace: 'on-first-retry',
  },

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

  // A real Server and the web export; e2e tests mock only the Agent CLI (AGENTS.md).
  webServer: [
    {
      name: 'Server',
      // The supervisor as desktop starts it; pnpm would report SIGTERM as a failure.
      command: `node --import tsx ../../e2e/mock-agents.ts '${mockAgentDirectory}' && exec node --import tsx src/main.ts`,
      // The web export has the default Server URL, ws://127.0.0.1:7337, built in (spec section 8).
      url: 'http://127.0.0.1:7337/trpc/system.info',
      cwd: path.join(repositoryRoot, 'apps/server'),
      // Playwright empties test-results before it starts web servers, so each run gets a fresh home.
      env: {
        ARGO_HOME: path.join(
          import.meta.dirname,
          'test-results',
          'server-home',
        ),
        PATH: [mockAgentDirectory, process.env.PATH ?? ''].join(path.delimiter),
      },
      // Never reuse a dev Server, which runs on the owner's ~/.argo.
      reuseExistingServer: false,
      // SIGTERM lets the supervisor stop the Engine and remove server.json (spec section 5).
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
