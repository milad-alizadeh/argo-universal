import path from 'node:path';
import { readServerAddress } from '@repo/engine/server-runtime';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import {
  type ChildHandle,
  childEnvironment,
  isAlive,
  pollUntil,
  signalStop,
} from '@repo/process';
import {
  prepareSupervisorRuntime,
  startSupervisor,
  supervisorEnvironment,
} from './desktop/supervisor';
import { startOwnServer } from './own-server';

interface DesktopServer {
  fixtureServer: Awaited<ReturnType<typeof startOwnServer>>;
  home: string;
  launchDirectory: string;
  environment: NodeJS.ProcessEnv;
  // A Supervisor the test started, which desktop reuses.
  supervisor?: ChildHandle;
}

type DesktopServerInput = {
  directory: string;
  agents: AppFixtureAgents;
  ownsSupervisor: boolean;
  usesSupervisor: boolean;
};

async function configureSupervisor(
  server: DesktopServer,
  input: DesktopServerInput,
): Promise<void> {
  await server.fixtureServer.stop();
  const runtime = await prepareSupervisorRuntime(input.directory);
  Object.assign(
    server.environment,
    supervisorEnvironment({ ...input, port: server.fixtureServer.port }),
  );

  if (input.ownsSupervisor) server.launchDirectory = runtime.app;
  else server.supervisor = await startReusedSupervisor(server, runtime.cli);
}

const startReusedSupervisor = (
  server: DesktopServer,
  cli: string,
): Promise<ChildHandle> =>
  startSupervisor({ cli, home: server.home, env: server.environment });

async function withSupervisor(
  server: DesktopServer,
  input: DesktopServerInput,
): Promise<DesktopServer> {
  try {
    await configureSupervisor(server, input);

    return server;
  } catch (error) {
    await stopDesktopServer(server, false);
    throw error;
  }
}

export async function prepareDesktopServer(
  input: DesktopServerInput,
): Promise<DesktopServer> {
  const fixtureServer = await startOwnServer(input.directory, input.agents);
  const server = desktopServer(fixtureServer, input.directory);

  return input.usesSupervisor ? withSupervisor(server, input) : server;
}

// Desktop launches from the repository and finds the fixture Server's home, without the Expo dev URL.
function desktopServer(
  fixtureServer: DesktopServer['fixtureServer'],
  directory: string,
): DesktopServer {
  const home = path.join(directory, 'server-home');

  return {
    fixtureServer,
    home,
    launchDirectory: path.resolve(import.meta.dirname, '../apps/desktop'),
    environment: childEnvironment({
      ARGO_HOME: home,
      ARGO_EXPO_WEB_URL: undefined,
    }),
  };
}

// A Supervisor that desktop started and left running, as Keep on quit does.
async function stopLeftoverSupervisor(home: string): Promise<void> {
  const leftover = readServerAddress(home);

  if (!leftover) return;
  signalStop(leftover.pid);
  await pollUntil(
    (): true | undefined => (isAlive(leftover.pid) ? undefined : true),
    'The owned Supervisor did not stop',
  );
}

// Stops every Server process the test started, and one desktop started and kept.
export async function stopDesktopServer(
  server: DesktopServer,
  ownsSupervisor: boolean,
): Promise<void> {
  if (ownsSupervisor) await stopLeftoverSupervisor(server.home);
  await server.supervisor?.stop();
  await server.fixtureServer.stop();
}
