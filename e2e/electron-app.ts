import { type ElectronApplication } from '@playwright/test';
import { supervisorStopGraceMs } from '@repo/cli/supervisor-command';
import { readServerAddress } from '@repo/engine/server-runtime';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { hasExited, stopProcess } from '@repo/process';
import { appForElectron, launchElectron } from './electron-fixture';
import {
  type DesktopServer,
  prepareDesktopServer,
  stopDesktopServer,
  type SupervisorMode,
} from './electron-server';
import type { App } from './fixtures';

export type ElectronInput = {
  directory: string;
  userDataDirectory: string;
  mockAgents: AppFixtureAgents;
  mode: SupervisorMode;
  use: (app: App) => Promise<void>;
};

async function cleanElectron(
  server: DesktopServer,
  application: ElectronApplication | undefined,
): Promise<void> {
  try {
    await closeElectron(application, server.mode);
  } finally {
    await stopDesktopServer(server);
  }
}

// Only an owned Supervisor may outlive desktop; any other left running is stopped, then reported.
async function assertSupervisorStopped(server: DesktopServer): Promise<void> {
  const leftover = readServerAddress(server.home);

  if (server.mode === 'owned' || !leftover) return;
  await stopProcess(leftover.pid, supervisorStopGraceMs);
  throw new Error(
    `Desktop quit but left its Server (pid ${leftover.pid}) running`,
  );
}

export async function useElectronApp(input: ElectronInput): Promise<void> {
  const server = await prepareDesktopServer({
    directory: input.directory,
    agents: input.mockAgents,
    mode: input.mode,
  });

  let application: ElectronApplication | undefined;

  try {
    application = await launchElectron(input, server);
    await input.use(await appForElectron(input, server, application));
  } finally {
    await cleanElectron(server, application);
  }

  await assertSupervisorStopped(server);
}

async function closeElectron(
  application: ElectronApplication | undefined,
  mode: SupervisorMode,
): Promise<void> {
  if (!application || hasExited(application.process())) return;

  await shutdownElectron(application, mode);
}

async function shutdownElectron(
  application: ElectronApplication,
  mode: SupervisorMode,
): Promise<void> {
  await (mode === 'owned' ? exitElectron(application) : application.close());
}

async function exitElectron(application: ElectronApplication): Promise<void> {
  await application.evaluate(({ app }): void => {
    app.exit();
  });
}
