import { createRequire } from 'node:module';
import path from 'node:path';
import {
  _electron as electron,
  type ElectronApplication,
} from '@playwright/test';
import { readServerAddress } from '@repo/engine/server-runtime';
import { pollUntil } from '@repo/process';
import { z } from 'zod';
import type { ElectronInput } from './electron-app';
import type { prepareDesktopServer } from './electron-server';
import type { App } from './fixtures';
import { serverFiles } from './own-server-setup';

const desktopDirectory = path.resolve(import.meta.dirname, '../apps/desktop');

// Resolve Electron from the desktop app, so the launch does not depend on pnpm hoisting.
const electronPath = z
  .string()
  .parse(
    createRequire(path.join(desktopDirectory, 'package.json'))('electron'),
  );

// Polls system.info, so a test never calls a Server that is still starting.
const waitForServer = (httpUrl: string): Promise<true> =>
  pollUntil(async (): Promise<true | undefined> => {
    const response = await fetch(`${httpUrl}/trpc/system.info`).catch(
      (): null => null,
    );

    return response?.ok ? true : undefined;
  }, 'The Server did not answer');

const waitForSupervisorAddress = (
  home: string,
): Promise<NonNullable<ReturnType<typeof readServerAddress>>> =>
  pollUntil(
    () => readServerAddress(home) ?? undefined,
    'The Supervisor did not publish its address',
  );

type DesktopServer = Awaited<ReturnType<typeof prepareDesktopServer>>;

type ElectronEnvironment = {
  ARGO_HOME: string;
  ARGO_USER_DATA_DIRECTORY: string;
  ARGO_BACKGROUND: string;
  PATH: string;
};

function electronEnvironment(
  input: ElectronInput,
  server: DesktopServer,
): ElectronEnvironment {
  return {
    ...server.environment,
    ARGO_HOME: server.home,
    ARGO_USER_DATA_DIRECTORY: input.userDataDirectory,
    ARGO_BACKGROUND: process.env.CI ? '0' : '1',
    PATH: input.ownsSupervisor
      ? `${path.dirname(process.execPath)}:/usr/bin:/bin`
      : '/usr/bin:/bin',
  };
}

export function launchElectron(
  input: ElectronInput,
  server: DesktopServer,
): Promise<ElectronApplication> {
  return electron.launch({
    executablePath: electronPath,
    args: [server.launchDirectory],
    env: electronEnvironment(input, server),
  });
}

export async function appForElectron(
  input: ElectronInput,
  server: DesktopServer,
  application: ElectronApplication,
): Promise<App> {
  await waitForServer(server.fixtureServer.httpUrl);
  const address = await waitForSupervisorAddress(server.home);

  return electronFixture(input, server, { application, pid: address.pid });
}

type ElectronDetails = { application: ElectronApplication; pid: number };

function desktopDetails(
  server: DesktopServer,
  { application, pid }: ElectronDetails,
): NonNullable<App['desktop']> {
  return {
    application,
    home: server.home,
    supervisorPid: pid,
    disconnect: server.fixtureServer.stop,
  };
}

async function electronFixture(
  input: ElectronInput,
  server: DesktopServer,
  details: ElectronDetails,
): Promise<App> {
  return {
    page: await details.application.firstWindow(),
    httpUrl: server.fixtureServer.httpUrl,
    registryPath: server.fixtureServer.registryPath,
    installationPath: server.fixtureServer.installationPath,
    ...serverFiles(input.directory),
    restartEngine: server.fixtureServer.restart,
    desktop: desktopDetails(server, details),
  };
}
