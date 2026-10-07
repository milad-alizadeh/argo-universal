import { readFileSync } from 'node:fs';
import { mkdir, readFile, symlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  test as base,
  _electron as electron,
  type Page,
} from '@playwright/test';
import { z } from 'zod';
import { type MockAgents, writeMockAgents } from './mock-agents';
import {
  findFreePort,
  pollServer,
  serverHttpUrl,
  startOwnServer,
} from './own-server';
import { createProjectRepository } from './project-repository';

export type AppOptions = { appTarget: 'web' | 'electron' };

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const desktopDirectory = path.join(repositoryRoot, 'apps/desktop');
// Resolve Electron from the desktop app, so the launch does not depend on pnpm hoisting.
const electronPath = createRequire(path.join(desktopDirectory, 'package.json'))(
  'electron',
) as string;

const ServerPackage = z.object({ version: z.string() });
const ServerProcess = z.object({ pid: z.int() });

// The version the Server reports in system.info.
export const serverVersion = ServerPackage.parse(
  JSON.parse(
    readFileSync(path.join(repositoryRoot, 'apps/server/package.json'), 'utf8'),
  ),
).version;

// The supervisor removes server.json when it stops, so a file left behind names a Server still running.
const readServerPid = async (home: string) => {
  const text = await readFile(path.join(home, 'server.json'), 'utf8').catch(
    () => null,
  );
  return text === null ? null : ServerProcess.parse(JSON.parse(text)).pid;
};

// The App prefers the Server URL the desktop preload sets over its built-in one, so tests can point it at any port.
const pointAppAtServer = (page: Page, serverUrl: string) =>
  page.addInitScript((url) => {
    Object.assign(globalThis, { argo: { serverUrl: url } });
  }, serverUrl);

export type ServerOptions = {
  // Each Agent's mock CLI options for this test's Server; an Agent left out replays its usual Turn.
  mockAgents: MockAgents;
};

type App = { page: Page; httpUrl: string };

// Polls system.info, so a test never calls a Server that is still starting.
const waitForServer = (httpUrl: string) =>
  pollServer(
    async () => {
      const response = await fetch(`${httpUrl}/trpc/system.info`).catch(
        () => null,
      );
      return response?.ok ? true : undefined;
    },
    (seconds) => `The Server did not answer within ${seconds} s`,
  );

export const test = base.extend<
  AppOptions & ServerOptions & { app: App; server: { httpUrl: string } }
>({
  appTarget: ['web', { option: true }],
  mockAgents: [{}, { option: true }],
  // The App on a Server of the test's own, so tests never share state; the port, mock CLIs, Project and teardown stay in here.
  app: async ({ appTarget, context, mockAgents }, use, testInfo) => {
    // Starting a Server compiles it with tsx, which takes seconds when several runs share the machine.
    test.slow();
    if (appTarget === 'web') {
      const server = await startOwnServer(
        testInfo.outputPath('own-server'),
        mockAgents,
      );
      try {
        const page = await context.newPage();
        await pointAppAtServer(page, server.serverUrl);
        await page.goto('/');
        await use({ page, httpUrl: server.httpUrl });
      } finally {
        await server.stop();
      }
      return;
    }

    // Desktop starts its own Server in a fresh home on a free port.
    const home = testInfo.outputPath('server-home');
    const agentPath = await writeMockAgents(
      testInfo.outputPath('agent-bin'),
      mockAgents,
    );
    // Desktop starts the Server with `node` from PATH; a folder holding only node keeps real Agent CLIs beside it off PATH.
    const nodeDirectory = testInfo.outputPath('node-bin');
    await mkdir(nodeDirectory, { recursive: true });
    await symlink(process.execPath, path.join(nodeDirectory, 'node'));
    const port = await findFreePort();
    const {
      ARGO_EXPO_WEB_URL: _webDevelopmentUrl,
      ELECTRON_RUN_AS_NODE: _runAsNode,
      ...environment
    } = process.env;
    const electronApp = await electron.launch({
      executablePath: electronPath,
      args: [desktopDirectory],
      // `env` replaces the whole environment; without ARGO_EXPO_WEB_URL the window loads the web export over app://.
      env: {
        ...environment,
        ARGO_HOME: home,
        ARGO_SERVER_PORT: String(port),
        // Its own app data, so parallel launches each get the single-instance lock.
        ARGO_USER_DATA_DIRECTORY: testInfo.outputPath('user-data'),
        ARGO_BACKGROUND: '1',
        PATH: [nodeDirectory, agentPath].join(path.delimiter),
        ARGO_PROJECT_PATH: await createProjectRepository(
          testInfo.outputPath('project'),
        ),
      },
    });
    try {
      const httpUrl = serverHttpUrl(port);
      await waitForServer(httpUrl);
      await use({ page: await electronApp.firstWindow(), httpUrl });
    } finally {
      // Quitting stops the Server that desktop started.
      await electronApp.close();
    }
    const leftoverPid = await readServerPid(home);
    if (leftoverPid !== null) {
      process.kill(leftoverPid, 'SIGTERM');
      throw new Error(
        `Desktop quit but left its Server (pid ${leftoverPid}) running`,
      );
    }
  },
  page: async ({ app }, use) => {
    await use(app.page);
  },
  server: async ({ app }, use) => {
    await use({ httpUrl: app.httpUrl });
  },
});

export { expect } from '@playwright/test';
