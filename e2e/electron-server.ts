import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import {
  ownedSupervisorEnvironment,
  prepareSupervisorRuntime,
} from './desktop/owned-supervisor';
import { pollServer, startOwnServer } from './own-server';

interface DesktopServer {
  fixtureServer: Awaited<ReturnType<typeof startOwnServer>>;
  home: string;
  launchDirectory: string;
  environment: NodeJS.ProcessEnv;
  externalSupervisor?: ChildProcess;
}

export async function prepareDesktopServer(input: {
  directory: string;
  agents: AppFixtureAgents;
  ownsSupervisor: boolean;
  usesSupervisor: boolean;
}): Promise<DesktopServer> {
  const fixtureServer = await startOwnServer(input.directory, input.agents);
  const home = path.join(input.directory, 'server-home');

  const {
    ARGO_EXPO_WEB_URL: _webUrl,
    ELECTRON_RUN_AS_NODE: _asNode,
    ...environment
  } = process.env;

  const server: DesktopServer = {
    fixtureServer,
    home,
    launchDirectory: path.resolve(import.meta.dirname, '../apps/desktop'),
    environment: { ...environment, ARGO_HOME: home },
  };

  if (!input.usesSupervisor) return server;
  await fixtureServer.stop();
  const runtime = await prepareSupervisorRuntime(input.directory);
  Object.assign(
    server.environment,
    ownedSupervisorEnvironment({
      directory: input.directory,
      server: fixtureServer,
      agents: input.agents,
    }),
  );

  if (input.ownsSupervisor) server.launchDirectory = runtime.app;
  else
    server.externalSupervisor = spawn(
      process.execPath,
      ['--import', 'tsx', 'src/main.ts'],
      {
        cwd: runtime.server,
        env: server.environment,
        stdio: 'ignore',
      },
    );

  return server;
}

export async function stopExternalSupervisor(
  child: ChildProcess | undefined,
): Promise<void> {
  if (!child || child.exitCode !== null) return;

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
    async (): Promise<true | undefined> => {
      try {
        process.kill(pid, 0);

        return undefined;
      } catch {
        return true;
      }
    },
    (seconds): string =>
      `The owned Supervisor did not stop within ${seconds} s`,
  );
}
