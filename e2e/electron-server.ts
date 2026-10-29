import path from 'node:path';
import { supervisorStopGraceMs } from '@repo/cli/supervisor-command';
import { readServerAddress } from '@repo/engine/server-runtime';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { type ChildHandle, childEnvironment, stopProcess } from '@repo/process';
import {
  prepareSupervisorRuntime,
  startSupervisor,
  supervisorEnvironment,
} from './desktop/supervisor';
import { startOwnServer } from './own-server';

/*
 * `fixture`: desktop finds the fixture Server. `reused`: the test starts a Supervisor that desktop finds and leaves running.
 * `owned`: desktop starts its own Supervisor from the shipped app layout.
 */
export type SupervisorMode = 'fixture' | 'reused' | 'owned';

type FixtureServer = Awaited<ReturnType<typeof startOwnServer>>;

type ServerBase = {
  fixtureServer: FixtureServer;
  home: string;
  launchDirectory: string;
  environment: NodeJS.ProcessEnv;
};

export type DesktopServer =
  | (ServerBase & { mode: 'fixture' | 'owned' })
  | (ServerBase & { mode: 'reused'; supervisor: ChildHandle });

type DesktopServerInput = {
  directory: string;
  agents: AppFixtureAgents;
  mode: SupervisorMode;
};

type SupervisedInput = DesktopServerInput & { mode: 'reused' | 'owned' };

const desktopDirectory = path.resolve(import.meta.dirname, '../apps/desktop');

// Desktop finds the Server's home, without the Expo dev URL.
const desktopEnvironment = (
  home: string,
  supervisor: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv =>
  childEnvironment({
    ...supervisor,
    ARGO_HOME: home,
    ARGO_EXPO_WEB_URL: undefined,
  });

type SupervisedBase = Omit<ServerBase, 'launchDirectory'> & {
  runtime: Awaited<ReturnType<typeof prepareSupervisorRuntime>>;
};

// The Supervisor's Engine takes the fixture Server's port, so the fixture Server stops first.
async function supervisedBase(
  input: SupervisedInput,
  fixtureServer: FixtureServer,
  home: string,
): Promise<SupervisedBase> {
  await fixtureServer.stop();

  const runtime = await prepareSupervisorRuntime(input.directory);

  const environment = desktopEnvironment(
    home,
    supervisorEnvironment({ ...input, port: fixtureServer.port }),
  );

  return { fixtureServer, home, environment, runtime };
}

async function reusedServer({
  runtime,
  ...base
}: SupervisedBase): Promise<DesktopServer> {
  const { home, environment: env } = base;
  const supervisor = await startSupervisor({ cli: runtime.cli, home, env });

  return {
    ...base,
    mode: 'reused',
    launchDirectory: desktopDirectory,
    supervisor,
  };
}

async function supervisedServer(
  input: SupervisedInput,
  fixtureServer: FixtureServer,
  home: string,
): Promise<DesktopServer> {
  const { runtime, ...base } = await supervisedBase(input, fixtureServer, home);

  if (input.mode === 'reused') return reusedServer({ runtime, ...base });

  return { ...base, mode: 'owned', launchDirectory: runtime.app };
}

export async function prepareDesktopServer(
  input: DesktopServerInput,
): Promise<DesktopServer> {
  const fixtureServer = await startOwnServer(input.directory, input.agents);
  const home = path.join(input.directory, 'server-home');

  if (input.mode === 'fixture')
    return {
      mode: 'fixture',
      fixtureServer,
      home,
      launchDirectory: desktopDirectory,
      environment: desktopEnvironment(home),
    };

  return supervisedServer({ ...input, mode: input.mode }, fixtureServer, home);
}

// A Supervisor that desktop started and left running, as Keep on quit does.
async function stopLeftoverSupervisor(home: string): Promise<void> {
  const leftover = readServerAddress(home);

  if (leftover) await stopProcess(leftover.pid, supervisorStopGraceMs);
}

// Stops every Server process the test started, and one desktop started and kept.
export async function stopDesktopServer(server: DesktopServer): Promise<void> {
  if (server.mode === 'owned') await stopLeftoverSupervisor(server.home);

  if (server.mode === 'reused')
    await server.supervisor.stop(supervisorStopGraceMs);
  await server.fixtureServer.stop();
}
