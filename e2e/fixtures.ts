import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type Page, type ElectronApplication } from '@playwright/test';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import type { GroupRelease } from '@repo/process';
import { test as base } from 'playwright-bdd';
import { z } from 'zod';
import { useApp } from './fixture-app';
import { SecondApp } from './second-app';

export type AppOptions = { appTarget: 'web' | 'electron' };

const repositoryRoot = path.resolve(import.meta.dirname, '..');

const ServerPackage = z.object({ version: z.string() });

// The version the Server reports in system.info.
export const serverVersion = ServerPackage.parse(
  JSON.parse(
    readFileSync(path.join(repositoryRoot, 'apps/server/package.json'), 'utf8'),
  ),
).version;

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
    disconnect: () => Promise<GroupRelease>;
  };
};

function prepareTest(tags: string[]): void {
  // Starting each test's own Server takes seconds when several runs share the machine.
  test.skip(
    tags.includes('@mac-only') && process.platform !== 'darwin',
    'The Dock and native macOS quit dialog require macOS',
  );
  test.slow();
}

export const test = base.extend<
  AppOptions &
    ServerOptions & {
      app: App;
      server: { httpUrl: string };
      secondApp: SecondApp;
    }
>({
  appTarget: ['web', { option: true }],
  mockAgents: [{}, { option: true }],
  // Each App uses isolated real storage and shared external Agent fixtures.
  app: async (
    { appTarget, context, mockAgents, $tags },
    use,
    testInfo,
  ): Promise<void> => {
    prepareTest($tags);

    await useApp({
      appTarget,
      context,
      mockAgents,
      tags: $tags,
      use,
      testInfo,
    });
  },
  // A second App on this computer, paired by the scenario that asks for it; whatever it opened is closed with the test.
  secondApp: async ({ app }, use): Promise<void> => {
    const secondApp = new SecondApp(app.httpUrl);

    try {
      await use(secondApp);
    } finally {
      secondApp.close();
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
