import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  type Page,
  type ElectronApplication,
  type Disposable,
} from '@playwright/test';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { test as base } from 'playwright-bdd';
import { z } from 'zod';
import { useElectronApp } from './electron-app';
import { serverFiles, startOwnServer } from './own-server';

export type AppOptions = { appTarget: 'web' | 'electron' };

const repositoryRoot = path.resolve(import.meta.dirname, '..');

const ServerPackage = z.object({ version: z.string() });

// The version the Server reports in system.info.
export const serverVersion = ServerPackage.parse(
  JSON.parse(
    readFileSync(path.join(repositoryRoot, 'apps/server/package.json'), 'utf8'),
  ),
).version;

// The App prefers the Server URL the desktop preload sets over its built-in one, so tests can point it at any port.
const pointAppAtServer = (page: Page, serverUrl: string): Promise<Disposable> =>
  page.addInitScript((url): void => {
    // A web page has no desktop App, so asking for a Supervisor does nothing.
    Object.assign(globalThis, {
      argo: { serverUrl: url, retryServer: () => {} },
    });
  }, serverUrl);

export type ServerOptions = {
  // Shared Argo fixture options by registered Agent identity.
  mockAgents: AppFixtureAgents;
};

export type App = {
  page: Page;
  httpUrl: string;
  registryPath: string;
  installationPath: string;
  projectPath: string;
  requestLogPath: string;
  restartEngine: (whileStopped: () => Promise<void>) => Promise<void>;
  // Another page of the web App on the same Server, as a second device.
  openPage?: () => Promise<Page>;
  desktop?: {
    application: ElectronApplication;
    home: string;
    supervisorPid: number;
    disconnect: () => Promise<void>;
  };
};

const ownServerDirectory = 'own-server';

export const test = base.extend<
  AppOptions & ServerOptions & { app: App; server: { httpUrl: string } }
>({
  appTarget: ['web', { option: true }],
  mockAgents: [{}, { option: true }],
  // Each App uses isolated real storage and shared external Agent fixtures.
  app: async (
    { appTarget, context, mockAgents, $tags },
    use,
    testInfo,
  ): Promise<void> => {
    // Starting each test's own Server takes seconds when several runs share the machine.
    test.skip(
      $tags.includes('@mac-only') && process.platform !== 'darwin',
      'The Dock and native macOS quit dialog require macOS',
    );
    test.slow();

    if (appTarget === 'web') {
      const serverDirectory = testInfo.outputPath(ownServerDirectory);

      const server = await startOwnServer(serverDirectory, mockAgents, {
        noProjects: $tags.includes('@without-projects'),
        registryOffline: $tags.includes('@registry-offline'),
      });

      try {
        const page = await context.newPage();
        await pointAppAtServer(page, server.serverUrl);
        await use({
          page,
          httpUrl: server.httpUrl,
          registryPath: server.registryPath,
          installationPath: server.installationPath,
          ...serverFiles(serverDirectory),
          restartEngine: server.restart,
          openPage: async (): Promise<Page> => {
            const other = await context.newPage();
            await pointAppAtServer(other, server.serverUrl);

            return other;
          },
        });
      } finally {
        await server.stop();
      }

      return;
    }

    await useElectronApp({
      directory: testInfo.outputPath(ownServerDirectory),
      userDataDirectory: testInfo.outputPath('user-data'),
      mockAgents,
      ownsSupervisor: $tags.includes('@owned-supervisor'),
      usesSupervisor: $tags.includes('@supervisor'),
      use,
    });
  },
  page: async ({ app }, use): Promise<void> => {
    await use(app.page);
  },
  server: async ({ app }, use): Promise<void> => {
    await use({ httpUrl: app.httpUrl });
  },
});

export { expect } from '@playwright/test';
