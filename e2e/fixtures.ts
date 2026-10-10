import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  _electron as electron,
  type Page,
  type ElectronApplication,
  type Disposable,
} from '@playwright/test';
import { readServerAddress } from '@repo/engine/server-runtime';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { test as base } from 'playwright-bdd';
import { z } from 'zod';
import { pollServer, startOwnServer } from './own-server';

export type AppOptions = { appTarget: 'web' | 'electron' };

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const desktopDirectory = path.join(repositoryRoot, 'apps/desktop');
// Resolve Electron from the desktop app, so the launch does not depend on pnpm hoisting.
const electronPath = z
  .string()
  .parse(
    createRequire(path.join(desktopDirectory, 'package.json'))('electron'),
  );

const ServerPackage = z.object({ version: z.string() });

// The version the Server reports in system.info.
export const serverVersion = ServerPackage.parse(
  JSON.parse(
    readFileSync(path.join(repositoryRoot, 'apps/server/package.json'), 'utf8'),
  ),
).version;

// The supervisor removes server.json when it stops, so a file left behind names a Server still running.
const readServerPid = (home: string): number | null =>
  readServerAddress(home)?.pid ?? null;

// The App prefers the Server URL the desktop preload sets over its built-in one, so tests can point it at any port.
const pointAppAtServer = (page: Page, serverUrl: string): Promise<Disposable> =>
  page.addInitScript((url): void => {
    Object.assign(globalThis, { argo: { serverUrl: url } });
  }, serverUrl);

export type ServerOptions = {
  // Shared Argo fixture options by registered Agent identity.
  mockAgents: AppFixtureAgents;
};

type App = { page: Page; httpUrl: string; registryPath: string };

// Polls system.info, so a test never calls a Server that is still starting.
const waitForServer = (httpUrl: string): Promise<true> =>
  pollServer(
    async (): Promise<true | undefined> => {
      const response = await fetch(`${httpUrl}/trpc/system.info`).catch(
        (): null => null,
      );
      return response?.ok ? true : undefined;
    },
    (seconds): string => `The Server did not answer within ${seconds} s`,
  );

export const test = base.extend<
  AppOptions & ServerOptions & { app: App; server: { httpUrl: string } }
>({
  appTarget: ['web', { option: true }],
  mockAgents: [{}, { option: true }],
  // Each App uses isolated real storage and shared external Agent fixtures.
  app: async (
    { appTarget, context, mockAgents },
    use,
    testInfo,
  ): Promise<void> => {
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
        await use({
          page,
          httpUrl: server.httpUrl,
          registryPath: server.registryPath,
        });
      } finally {
        await server.stop();
      }
      return;
    }

    const directory = testInfo.outputPath('own-server');
    const fixtureServer = await startOwnServer(directory, mockAgents);
    const home = path.join(directory, 'server-home');
    const {
      ARGO_EXPO_WEB_URL: _webDevelopmentUrl,
      ELECTRON_RUN_AS_NODE: _runAsNode,
      ...environment
    } = process.env;
    let electronApp: ElectronApplication | undefined;
    try {
      electronApp = await electron.launch({
        executablePath: electronPath,
        args: [desktopDirectory],
        // `env` replaces the whole environment; without ARGO_EXPO_WEB_URL the window loads the web export over app://.
        env: {
          ...environment,
          ARGO_HOME: home,
          // Its own app data, so parallel launches each get the single-instance lock.
          ARGO_USER_DATA_DIRECTORY: testInfo.outputPath('user-data'),
          ARGO_BACKGROUND: '1',
          PATH: '/usr/bin:/bin',
        },
      });
      const httpUrl = fixtureServer.httpUrl;
      await waitForServer(httpUrl);
      await use({
        page: await electronApp.firstWindow(),
        httpUrl,
        registryPath: fixtureServer.registryPath,
      });
    } finally {
      // Close the App before gracefully stopping its fixture Engine.
      try {
        await electronApp?.close();
      } finally {
        await fixtureServer.stop();
      }
    }
    const leftoverPid = readServerPid(home);
    if (leftoverPid !== null) {
      process.kill(leftoverPid, 'SIGTERM');
      throw new Error(
        `Desktop quit but left its Server (pid ${leftoverPid}) running`,
      );
    }
  },
  page: async ({ app }, use): Promise<void> => {
    await use(app.page);
  },
  server: async ({ app }, use): Promise<void> => {
    await use({ httpUrl: app.httpUrl });
  },
});

export { expect } from '@playwright/test';
