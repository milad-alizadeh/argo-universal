import type { ChildProcess } from 'node:child_process';
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

type LaunchedElectron = {
  application: ElectronApplication;
  // Read at launch: Playwright cannot hand it out once the App has quit.
  child: ChildProcess;
};

async function cleanElectron(
  server: DesktopServer,
  launched: LaunchedElectron | undefined,
): Promise<void> {
  try {
    await closeElectron(launched, server.mode);
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

async function launchWithChild(
  input: ElectronInput,
  server: DesktopServer,
): Promise<LaunchedElectron> {
  const application = await launchElectron(input, server);

  return { application, child: application.process() };
}

export async function useElectronApp(input: ElectronInput): Promise<void> {
  const server = await prepareDesktopServer({
    directory: input.directory,
    agents: input.mockAgents,
    mode: input.mode,
  });

  let launched: LaunchedElectron | undefined;

  try {
    launched = await launchWithChild(input, server);
    await input.use(await appForElectron(input, server, launched.application));
  } finally {
    await cleanElectron(server, launched);
  }

  await assertSupervisorStopped(server);
}

async function closeElectron(
  launched: LaunchedElectron | undefined,
  mode: SupervisorMode,
): Promise<void> {
  if (!launched || hasExited(launched.child)) return;

  await shutdownElectron(launched.application, mode);
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
