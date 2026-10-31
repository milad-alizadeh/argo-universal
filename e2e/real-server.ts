import { stat } from 'node:fs/promises';
import path from 'node:path';
import { supervisorStopGraceMs } from '@repo/cli/supervisor-command';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { findFreePort } from '@repo/mocks/network/free-port';
import { type ChildHandle, type GroupRelease, startChild } from '@repo/process';
import { serverPaths, type ServerPaths } from './own-server-setup';
import { serverHttpUrl, serverUrlFor } from './server-port';

/*
 * A real Engine, with the real ACP Registry and real Agents, in a disposable home.
 *
 * `own-server.ts` starts the Engine with the scripted Registry and fixture Agents, which is what
 * every e2e step and most perf scenarios want. A scenario that must drive an Agent the owner is
 * signed in to needs the opposite: the shipped Engine entry, the published Registry, and the
 * owner's credentials, with nothing else of the owner's reached.
 *
 * Two things are therefore pinned rather than defaulted. `ARGO_HOME` is a disposable directory, so
 * the run writes no Sessions, Agents or logs into the owner's home. `ARGO_PROJECT_PATH` is always
 * set to a disposable repository, because the Engine seeds its first Project from this variable and
 * falls back to the working directory when it is unset — which has resolved to the owner's own
 * checkout before now. The repository is created here rather than assumed, and the Engine is
 * refused a home whose Project is missing.
 *
 * The Engine inherits `PATH` and `HOME`: an npm-launched Agent needs Node on the path, and an Agent
 * authenticates by reading the owner's signed-in credentials from their home directory. No
 * credential is read, written or logged here.
 */

const repositoryRoot = path.resolve(import.meta.dirname, '..');

const engineEntry = path.join(repositoryRoot, 'apps/server/src/engine/main.ts');

const serverDirectory = path.join(repositoryRoot, 'apps/server');

export interface RealServer {
  port: number;
  serverUrl: string;
  httpUrl: string;
  home: string;
  projectPath: string;
  stop: () => Promise<GroupRelease>;
  // Stops the Engine, awaits `whileStopped`, then starts it again on the same port, home and data.
  restart: (whileStopped: () => Promise<void>) => Promise<void>;
}

// The fixture Engine's own environment overrides, which a real run must not inherit from its caller.
const fixtureOverrides = [
  'ARGO_E2E_AGENTS',
  'ARGO_E2E_REGISTRY_PATH',
  'ARGO_E2E_INSTALLATION_PATH',
  'ARGO_E2E_REQUEST_LOG',
  'ARGO_E2E_NO_PROJECTS',
  'ARGO_E2E_AUTH_EPOCH',
] as const;

const withoutFixtureOverrides = (): NodeJS.ProcessEnv => {
  const environment = { ...process.env };

  for (const name of fixtureOverrides) delete environment[name];

  return environment;
};

const engineEnvironment = (
  paths: ServerPaths,
  port: number,
): NodeJS.ProcessEnv => ({
  ...withoutFixtureOverrides(),
  ARGO_HOME: paths.home,
  ARGO_PROJECT_PATH: paths.projectPath,
  ARGO_SERVER_PORT: String(port),
});

const launchEngine = (paths: ServerPaths, port: number): ChildHandle =>
  startChild(
    {
      label: 'Server',
      entry: engineEntry,
      execArgv: ['--import', import.meta.resolve('tsx')],
      cwd: serverDirectory,
      env: engineEnvironment(paths, port),
    },
    { output: 'tail', group: 'caller' },
  );

/*
 * The shipped Engine publishes its address to a Supervisor over IPC rather than to a file, and this
 * run is its own supervisor, so readiness is the Engine answering on the port it was given.
 */
const answersOn = (httpUrl: string) => async (): Promise<true | undefined> => {
  try {
    const response = await fetch(`${httpUrl}/trpc/project.list?input=%7B%7D`);

    return response.ok ? true : undefined;
  } catch {
    return undefined;
  }
};

async function startReady(
  paths: ServerPaths,
  port: number,
): Promise<ChildHandle> {
  const engine = launchEngine(paths, port);

  try {
    await engine.waitUntil(answersOn(serverHttpUrl(port)));

    return engine;
  } catch (error) {
    await engine.stop(supervisorStopGraceMs);
    throw error;
  }
}

const isDirectory = async (file: string): Promise<boolean> => {
  try {
    return (await stat(file)).isDirectory();
  } catch {
    return false;
  }
};

async function requireProject(projectPath: string): Promise<void> {
  if (!(await isDirectory(projectPath)))
    throw new Error(
      `A real Server needs a disposable Project at ${projectPath}: without one the Engine seeds its Project from the working directory, which is the caller's own checkout.`,
    );
}

/*
 * Creates the disposable Project repository a real Server runs against. It is created once, before
 * the first Server starts; the Sessions a run seeds live in its checkouts.
 */
export async function prepareRealProject(directory: string): Promise<string> {
  const { projectPath } = serverPaths(directory);
  await initTestRepository(projectPath, false);

  return projectPath;
}

/*
 * Starts a real Engine in `directory`, with its disposable home and the Project repository
 * `prepareRealProject` made there. It is startable more than once over the same home and data.
 */
const serverAddresses = (
  paths: ServerPaths,
  port: number,
): Pick<
  RealServer,
  'port' | 'serverUrl' | 'httpUrl' | 'home' | 'projectPath'
> => ({
  port,
  serverUrl: serverUrlFor(port),
  httpUrl: serverHttpUrl(port),
  home: paths.home,
  projectPath: paths.projectPath,
});

function engineControls(
  paths: ServerPaths,
  port: number,
  started: ChildHandle,
): Pick<RealServer, 'stop' | 'restart'> {
  let engine = started;

  return {
    stop: (): Promise<GroupRelease> => engine.stop(supervisorStopGraceMs),
    restart: async (whileStopped): Promise<void> => {
      await engine.stop(supervisorStopGraceMs);
      await whileStopped();
      engine = await startReady(paths, port);
    },
  };
}

const realServer = (
  paths: ServerPaths,
  port: number,
  started: ChildHandle,
): RealServer => ({
  ...serverAddresses(paths, port),
  ...engineControls(paths, port, started),
});

export async function startRealServer(directory: string): Promise<RealServer> {
  const paths = serverPaths(directory);
  await requireProject(paths.projectPath);
  const port = await findFreePort();

  return realServer(paths, port, await startReady(paths, port));
}
