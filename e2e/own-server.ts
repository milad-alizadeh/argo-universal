import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { findFreePort } from '@repo/mocks/network/free-port';
import {
  type ChildHandle,
  type GroupRelease,
  startChild,
  stopLimitMs,
} from '@repo/process';
import { engineBundlePath } from './engine-bundle';
import {
  fixtureEnvironment,
  type InitialServerOptions,
  prepareServer,
  type ServerPaths,
} from './own-server-setup';
import { publishedAddress, serverHttpUrl, serverUrlFor } from './server-port';

const serverDirectory = path.resolve(import.meta.dirname, '../apps/server');

const attempts = 3;

const portTakenPattern = /EADDRINUSE/;

type Launch = {
  paths: ServerPaths;
  agents: AppFixtureAgents;
  initial: InitialServerOptions;
  port: number;
};

type OwnServer = {
  port: number;
  serverUrl: string;
  httpUrl: string;
  registryPath: string;
  installationPath: string;
  stop: () => Promise<GroupRelease>;
  restart: (whileStopped: () => Promise<void>) => Promise<void>;
};

// Starts a real Engine with shared external Agent fixtures in an isolated home.
export async function startOwnServer(
  directory: string,
  agents: AppFixtureAgents,
  initial: InitialServerOptions = {},
): Promise<OwnServer> {
  const paths = await prepareServer(directory, agents, initial);

  return tryPorts({ paths, agents, initial });
}

async function tryPorts(input: Omit<Launch, 'port'>): Promise<OwnServer> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const launch = { ...input, port: await findFreePort() };
    const engine = await startReady(launch);

    if (engine) return ownServer(launch, engine);
  }

  throw new Error(`Another process took the Server's port ${attempts} times`);
}

const serverEnvironment = (launch: Launch): NodeJS.ProcessEnv => ({
  ...fixtureEnvironment(launch.paths, launch.agents),
  ARGO_HOME: launch.paths.home,
  ARGO_E2E_NO_PROJECTS: launch.initial.noProjects ? '1' : '0',
  ARGO_SERVER_PORT: String(launch.port),
  ARGO_E2E_AUTH_EPOCH: randomUUID(),
  PATH: '/usr/bin:/bin',
});

// The Engine alone publishes its own address; it leads its own process group, so a stop also ends its Agents.
const launchServer = (launch: Launch): ChildHandle =>
  startChild(
    {
      label: 'Server',
      entry: engineBundlePath,
      cwd: serverDirectory,
      env: serverEnvironment(launch),
    },
    { output: 'tail' },
  );

// Only the Server in this isolated home can publish this port.
const publishesPort =
  ({ paths, port }: Launch) =>
  (): true | undefined =>
    publishedAddress(paths.home)()?.port === port ? true : undefined;

// The started Server, or undefined when another process took its port.
async function startReady(launch: Launch): Promise<ChildHandle | undefined> {
  const engine = launchServer(launch);

  try {
    await engine.waitUntil(publishesPort(launch));

    return engine;
  } catch (error) {
    await engine.stop(stopLimitMs);

    if (portTakenPattern.test(engine.stderrTail())) return undefined;
    throw error;
  }
}

const portTaken = ({ port }: Launch): never => {
  throw new Error(`Another process took port ${port}`);
};

const serverAddresses = ({
  port,
  paths,
}: Launch): Omit<OwnServer, 'stop' | 'restart'> => ({
  port,
  serverUrl: serverUrlFor(port),
  httpUrl: serverHttpUrl(port),
  registryPath: paths.registryPath,
  installationPath: paths.installationPath,
});

function ownServer(launch: Launch, started: ChildHandle): OwnServer {
  let engine = started;

  return {
    ...serverAddresses(launch),
    stop: (): Promise<GroupRelease> => engine.stop(stopLimitMs),
    restart: async (whileStopped): Promise<void> => {
      await engine.stop(stopLimitMs);
      await whileStopped();
      engine = (await startReady(launch)) ?? portTaken(launch);
    },
  };
}
