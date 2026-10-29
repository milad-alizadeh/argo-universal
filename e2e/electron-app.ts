import type { ChildProcess } from 'node:child_process';
import { type ElectronApplication } from '@playwright/test';
import { readServerAddress } from '@repo/engine/server-runtime';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { hasExited, signalStop } from '@repo/process';
import { appForElectron, launchElectron } from './electron-fixture';
import { prepareDesktopServer, stopDesktopServer } from './electron-server';
import type { App } from './fixtures';

export type ElectronInput = {
  directory: string;
  userDataDirectory: string;
  mockAgents: AppFixtureAgents;
  ownsSupervisor: boolean;
  usesSupervisor: boolean;
  use: (app: App) => Promise<void>;
};

type DesktopServer = Awaited<ReturnType<typeof prepareDesktopServer>>;

type ElectronProcess = {
  application: ElectronApplication | undefined;
  child: ChildProcess | undefined;
};

async function cleanElectron(
  server: DesktopServer,
  process: ElectronProcess,
  ownsSupervisor: boolean,
): Promise<void> {
  try {
    await closeElectron(process.application, process.child, ownsSupervisor);
  } finally {
    await stopDesktopServer(server, ownsSupervisor);
  }
}

function assertSupervisorStopped(home: string, ownsSupervisor: boolean): void {
  if (ownsSupervisor) return;
  const leftover = readServerAddress(home);

  if (!leftover) return;
  signalStop(leftover.pid);
  throw new Error(
    `Desktop quit but left its Server (pid ${leftover.pid}) running`,
  );
}

function prepareServer(input: ElectronInput): Promise<DesktopServer> {
  return prepareDesktopServer({
    directory: input.directory,
    agents: input.mockAgents,
    ownsSupervisor: input.ownsSupervisor,
    usesSupervisor: input.usesSupervisor,
  });
}

export async function useElectronApp(input: ElectronInput): Promise<void> {
  const server = await prepareServer(input);

  let application: ElectronApplication | undefined;
  let child: ChildProcess | undefined;

  try {
    application = await launchElectron(input, server);
    child = application.process();
    await input.use(await appForElectron(input, server, application));
  } finally {
    await cleanElectron(server, { application, child }, input.ownsSupervisor);
  }

  assertSupervisorStopped(server.home, input.ownsSupervisor);
}

async function closeElectron(
  application: ElectronApplication | undefined,
  child: ChildProcess | undefined,
  ownsSupervisor: boolean,
): Promise<void> {
  if (!application || !isRunning(child)) return;

  await shutdownElectron(application, ownsSupervisor);
}

function isRunning(child: ChildProcess | undefined): boolean {
  return child !== undefined && !hasExited(child);
}

async function exitElectron(application: ElectronApplication): Promise<void> {
  await application.evaluate(({ app }): void => {
    app.exit();
  });
}

async function shutdownElectron(
  application: ElectronApplication,
  ownsSupervisor: boolean,
): Promise<void> {
  await (ownsSupervisor ? exitElectron(application) : application.close());
}
