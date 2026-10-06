import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  test as base,
  _electron as electron,
  type Page,
} from '@playwright/test';
import { z } from 'zod';
import { type MockAgents, writeMockAgents } from './mock-agents';
import { findFreePort, serverUrlFor, startOwnServer } from './own-server';
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

export const ownServerSkipReason =
  'The desktop app starts its own Server, so its Agents cannot change per test';

// The web project's Server runs on a port chosen per run (playwright.config.ts).
const webProjectServerUrl = () => {
  const port = process.env.ARGO_E2E_SERVER_PORT;
  if (!port) throw new Error('playwright.config.ts sets ARGO_E2E_SERVER_PORT');
  return serverUrlFor(port);
};

type OwnServer = Awaited<ReturnType<typeof startOwnServer>>;

export const test = base.extend<
  AppOptions & {
    // Opens the web App on a Server of the test's own, with the given mock Agent CLIs.
    ownServer: (agents?: MockAgents) => Promise<OwnServer>;
  }
>({
  appTarget: ['web', { option: true }],
  ownServer: async ({ appTarget, page }, use, testInfo) => {
    test.skip(appTarget !== 'web', ownServerSkipReason);
    // Starting a Server compiles it with tsx, which takes seconds when several runs share the machine.
    test.slow();
    let server: OwnServer | undefined;
    try {
      await use(async (agents = {}) => {
        if (server) throw new Error('A test starts one Server of its own');
        server = await startOwnServer(
          testInfo.outputPath('own-server'),
          agents,
        );
        await pointAppAtServer(page, server.serverUrl);
        await page.goto('/');
        return server;
      });
    } finally {
      await server?.stop();
    }
  },
  page: async ({ appTarget, page }, use, testInfo) => {
    if (appTarget === 'web') {
      await pointAppAtServer(page, webProjectServerUrl());
      await page.goto('/');
      await use(page);
      return;
    }

    // Desktop starts its own Server in a fresh home on a free port, so it never meets the web project's Server.
    const home = testInfo.outputPath('server-home');
    const agentPath = await writeMockAgents(testInfo.outputPath('agent-bin'));
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
        ARGO_SERVER_PORT: String(await findFreePort()),
        // Its own app data, so parallel launches each get the single-instance lock.
        ARGO_USER_DATA_DIRECTORY: testInfo.outputPath('user-data'),
        ARGO_BACKGROUND: '1',
        PATH: agentPath,
        ARGO_PROJECT_PATH: await createProjectRepository(
          testInfo.outputPath('project'),
        ),
      },
    });
    try {
      await use(await electronApp.firstWindow());
    } finally {
      // Quitting stops the Server that desktop started (spec section 9).
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
});

export { expect } from '@playwright/test';
