import type { ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  _electron as electron,
  type ElectronApplication,
} from '@playwright/test';
import { readServerAddress } from '@repo/engine/server-runtime';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { z } from 'zod';
import {
  prepareDesktopServer,
  stopExternalSupervisor,
  stopOwnedSupervisor,
  waitForSupervisorAddress,
} from './electron-server';
import type { App } from './fixtures';
import { pollServer, serverFiles } from './own-server';

const desktopDirectory = path.resolve(import.meta.dirname, '../apps/desktop');

// Resolve Electron from the desktop app, so the launch does not depend on pnpm hoisting.
const electronPath = z
  .string()
  .parse(
    createRequire(path.join(desktopDirectory, 'package.json'))('electron'),
  );

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

export async function useElectronApp(input: {
  directory: string;
  userDataDirectory: string;
  mockAgents: AppFixtureAgents;
  ownsSupervisor: boolean;
  usesSupervisor: boolean;
  use: (app: App) => Promise<void>;
}): Promise<void> {
  const { directory, userDataDirectory, mockAgents, ownsSupervisor, use } =
    input;

  const {
    fixtureServer,
    home,
    launchDirectory,
    environment,
    externalSupervisor,
  } = await prepareDesktopServer({
    directory,
    agents: mockAgents,
    ownsSupervisor,
    usesSupervisor: input.usesSupervisor,
  });

  let electronApp: ElectronApplication | undefined;
  let electronProcess: ChildProcess | undefined;

  try {
    electronApp = await electron.launch({
      executablePath: electronPath,
      args: [launchDirectory],
      // `env` replaces the whole environment; without ARGO_EXPO_WEB_URL the window loads the web export over app://.
      env: {
        ...environment,
        ARGO_HOME: home,
        // Its own app data, so parallel launches each get the single-instance lock.
        ARGO_USER_DATA_DIRECTORY: userDataDirectory,
        // CI's xvfb display has no one's focus to take, and a hidden window there draws a frame only every few seconds, which every click waits for.
        ARGO_BACKGROUND: process.env.CI ? '0' : '1',
        PATH: ownsSupervisor
          ? `${path.dirname(process.execPath)}:/usr/bin:/bin`
          : '/usr/bin:/bin',
      },
    });
    electronProcess = electronApp.process();
    const httpUrl = fixtureServer.httpUrl;
    await waitForServer(httpUrl);
    const address = await waitForSupervisorAddress(home);
    await use({
      page: await electronApp.firstWindow(),
      httpUrl,
      registryPath: fixtureServer.registryPath,
      installationPath: fixtureServer.installationPath,
      ...serverFiles(directory),
      restartEngine: fixtureServer.restart,
      desktop: {
        application: electronApp,
        home,
        supervisorPid: address.pid,
        disconnect: fixtureServer.stop,
      },
    });
  } finally {
    // Close the App before gracefully stopping its fixture Engine.
    try {
      await closeElectron(electronApp, electronProcess, ownsSupervisor);
    } finally {
      const leftover = readServerAddress(home);

      if (ownsSupervisor && leftover) await stopOwnedSupervisor(leftover.pid);
      await stopExternalSupervisor(externalSupervisor);
      await fixtureServer.stop();
    }
  }

  // The supervisor removes server.json when it stops, so a file left behind names a Server still running.
  const leftoverPid = readServerAddress(home)?.pid ?? null;

  if (leftoverPid !== null && !ownsSupervisor) {
    process.kill(leftoverPid, 'SIGTERM');
    throw new Error(
      `Desktop quit but left its Server (pid ${leftoverPid}) running`,
    );
  }
}

async function closeElectron(
  application: ElectronApplication | undefined,
  child: ChildProcess | undefined,
  ownsSupervisor: boolean,
): Promise<void> {
  if (!application || child?.exitCode !== null) return;
  await (ownsSupervisor
    ? application.evaluate(({ app }): void => {
        app.exit();
      })
    : application.close());
}
