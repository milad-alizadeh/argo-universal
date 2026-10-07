import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import type { AppOptions } from './fixtures';
import { mockAgentPath } from './mock-agents';
import { findFreePort } from './own-server';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
// Beside the Server's home, so each run writes fresh mock Agent CLIs.
const mockAgentDirectory = path.join(
  import.meta.dirname,
  'test-results',
  'agent-bin',
);
const projectDirectory = path.join(
  import.meta.dirname,
  'test-results',
  'project',
);

// Free ports per run, so runs in several worktrees never meet; workers inherit them from the runner, which loads this file first.
process.env.ARGO_E2E_SERVER_PORT ??= String(await findFreePort());
const serverPort = process.env.ARGO_E2E_SERVER_PORT;
while (
  !process.env.ARGO_E2E_WEB_PORT ||
  process.env.ARGO_E2E_WEB_PORT === serverPort
) {
  process.env.ARGO_E2E_WEB_PORT = String(await findFreePort());
}
const webPort = process.env.ARGO_E2E_WEB_PORT;
const webUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig<AppOptions>({
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
      command: `node --import tsx ../../e2e/mock-agents.ts '${mockAgentDirectory}' && node --import tsx ../../e2e/project-repository.ts '${projectDirectory}' && exec node --import tsx src/main.ts`,
      // The page fixture points the web App at this Server's port (fixtures.ts).
      url: `http://127.0.0.1:${serverPort}/trpc/system.info`,
      cwd: path.join(repositoryRoot, 'apps/server'),
      // Playwright empties test-results before it starts web servers, so each run gets a fresh home.
      env: {
        ARGO_HOME: path.join(
          import.meta.dirname,
          'test-results',
          'server-home',
        ),
        ARGO_SERVER_PORT: serverPort,
        PATH: mockAgentPath(mockAgentDirectory),
        ARGO_PROJECT_PATH: projectDirectory,
      },
      // Never reuse a dev Server, which runs on the owner's ~/.argo.
      reuseExistingServer: false,
      // SIGTERM lets the supervisor stop the Engine and remove server.json (spec section 5).
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
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
