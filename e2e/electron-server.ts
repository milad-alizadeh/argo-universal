import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { readServerAddress } from '@repo/engine/server-runtime';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import {
  ownedSupervisorEnvironment,
  prepareSupervisorRuntime,
} from './desktop/owned-supervisor';
import { pollServer, startOwnServer } from './own-server';
import { hasExited } from './server-process';

interface DesktopServer {
  fixtureServer: Awaited<ReturnType<typeof startOwnServer>>;
  home: string;
  launchDirectory: string;
  environment: NodeJS.ProcessEnv;
  externalSupervisor?: ChildProcess;
}

type DesktopServerInput = {
  directory: string;
  agents: AppFixtureAgents;
  ownsSupervisor: boolean;
  usesSupervisor: boolean;
};

function desktopEnvironment(home: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env, ARGO_HOME: home };
  delete environment.ARGO_EXPO_WEB_URL;
  delete environment.ELECTRON_RUN_AS_NODE;

  return environment;
}

function setSupervisorEnvironment(
  server: DesktopServer,
  input: DesktopServerInput,
): void {
  Object.assign(
    server.environment,
    ownedSupervisorEnvironment({
      directory: input.directory,
      server: server.fixtureServer,
      agents: input.agents,
    }),
  );
}

async function startExternalSupervisor(
  server: DesktopServer,
  cwd: string,
): Promise<void> {
  server.externalSupervisor = spawn(
    process.execPath,
    ['--import', 'tsx', 'src/main.ts'],
    {
      cwd,
      env: server.environment,
      stdio: 'ignore',
    },
  );
  await waitForSupervisorAddress(server.home);
}

async function configureSupervisor(
  server: DesktopServer,
  input: DesktopServerInput,
): Promise<void> {
  await server.fixtureServer.stop();
  const runtime = await prepareSupervisorRuntime(input.directory);
  setSupervisorEnvironment(server, input);

  if (input.ownsSupervisor) server.launchDirectory = runtime.app;
  else await startExternalSupervisor(server, runtime.server);
}

async function withSupervisor(
  server: DesktopServer,
  input: DesktopServerInput,
): Promise<DesktopServer> {
  try {
    await configureSupervisor(server, input);

    return server;
  } catch (error) {
    await stopExternalSupervisor(server.externalSupervisor);
    await server.fixtureServer.stop();
    throw error;
  }
}

export async function prepareDesktopServer(
  input: DesktopServerInput,
): Promise<DesktopServer> {
  const fixtureServer = await startOwnServer(input.directory, input.agents);
  const home = path.join(input.directory, 'server-home');

  const server: DesktopServer = {
    fixtureServer,
    home,
    launchDirectory: path.resolve(import.meta.dirname, '../apps/desktop'),
    environment: desktopEnvironment(home),
  };

  return input.usesSupervisor ? withSupervisor(server, input) : server;
}

export function waitForSupervisorAddress(
  home: string,
): Promise<NonNullable<ReturnType<typeof readServerAddress>>> {
  return pollServer(
    async (): Promise<
      NonNullable<ReturnType<typeof readServerAddress>> | undefined
    > => readServerAddress(home) ?? undefined,
    (seconds): string =>
      `The Supervisor did not publish its address within ${seconds} s`,
  );
}

export async function stopExternalSupervisor(
  child: ChildProcess | undefined,
): Promise<void> {
  if (!child || hasExited(child)) return;

  const exited = new Promise<void>((resolve): void => {
    child.once('exit', (): void => resolve());
  });

  child.kill('SIGTERM');
  await exited;
}

export async function stopOwnedSupervisor(pid: number): Promise<void> {
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return;
  }

  await pollServer(
    (): Promise<true | undefined> => ownedSupervisorExited(pid),
    (seconds): string =>
      `The owned Supervisor did not stop within ${seconds} s`,
  );
}

async function ownedSupervisorExited(pid: number): Promise<true | undefined> {
  try {
    process.kill(pid, 0);

    return undefined;
  } catch {
    return true;
  }
}
