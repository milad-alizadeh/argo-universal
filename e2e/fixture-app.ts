import type {
  BrowserContext,
  Disposable,
  Page,
  TestInfo,
} from '@playwright/test';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { useElectronApp } from './electron-app';
import type { App, AppOptions } from './fixtures';
import { startOwnServer } from './own-server';
import { serverFiles } from './own-server-setup';

// The App prefers the Server URL the desktop preload sets over its built-in one, so tests can point it at any port.
const pointAppAtServer = (page: Page, serverUrl: string): Promise<Disposable> =>
  page.addInitScript((url): void => {
    Object.assign(globalThis, { argo: { serverUrl: url } });
  }, serverUrl);

const ownServerDirectory = 'own-server';

async function openWebPage(
  context: BrowserContext,
  serverUrl: string,
): Promise<Page> {
  const page = await context.newPage();
  await pointAppAtServer(page, serverUrl);

  return page;
}

type WebAppInput = {
  context: BrowserContext;
  directory: string;
  agents: AppFixtureAgents;
  tags: string[];
  use: (app: App) => Promise<void>;
};

async function useWebApp(input: WebAppInput): Promise<void> {
  const server = await startOwnServer(input.directory, input.agents, {
    noProjects: input.tags.includes('@without-projects'),
    registryOffline: input.tags.includes('@registry-offline'),
  });

  try {
    await input.use(await makeWebApp(input, server));
  } finally {
    await server.stop();
  }
}

async function makeWebApp(
  input: WebAppInput,
  server: Awaited<ReturnType<typeof startOwnServer>>,
): Promise<App> {
  return {
    page: await openWebPage(input.context, server.serverUrl),
    httpUrl: server.httpUrl,
    registryPath: server.registryPath,
    installationPath: server.installationPath,
    ...serverFiles(input.directory),
    restartEngine: server.restart,
    openPage: (): Promise<Page> => openWebPage(input.context, server.serverUrl),
  };
}

type AppInput = {
  appTarget: AppOptions['appTarget'];
  context: BrowserContext;
  mockAgents: AppFixtureAgents;
  tags: string[];
  use: (app: App) => Promise<void>;
  testInfo: TestInfo;
};

export async function useApp(input: AppInput): Promise<void> {
  const { appTarget, context, mockAgents, tags, use, testInfo } = input;

  if (appTarget === 'web') {
    await useWebApp({
      context,
      directory: testInfo.outputPath(ownServerDirectory),
      agents: mockAgents,
      tags,
      use,
    });

    return;
  }

  await useDesktopApp(input);
}

async function useDesktopApp(input: AppInput): Promise<void> {
  const { testInfo, mockAgents, tags, use } = input;

  await useElectronApp({
    directory: testInfo.outputPath(ownServerDirectory),
    userDataDirectory: testInfo.outputPath('user-data'),
    mockAgents,
    ownsSupervisor: tags.includes('@owned-supervisor'),
    usesSupervisor: tags.includes('@supervisor'),
    use,
  });
}
