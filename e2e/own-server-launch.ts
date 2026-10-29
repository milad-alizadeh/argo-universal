import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { Readable } from 'node:stream';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { engineBundlePath } from './engine-bundle';
import { requestLogName } from './own-server-files';
import type { InitialServerOptions, ServerPaths } from './own-server-setup';

const serverDirectory = path.resolve(import.meta.dirname, '../apps/server');

type ServerProcess = ChildProcessByStdio<null, Readable, Readable>;

export type LaunchOptions = {
  paths: ServerPaths;
  agents: AppFixtureAgents;
  initial: InitialServerOptions;
  port: number;
};

function environment(options: LaunchOptions): NodeJS.ProcessEnv {
  const { paths, agents, initial, port } = options;

  return {
    ...process.env,
    ...fixtureEnvironment(paths, agents),
    ARGO_HOME: paths.home,
    ARGO_E2E_NO_PROJECTS: initial.noProjects ? '1' : '0',
    ARGO_SERVER_PORT: String(port),
    ARGO_E2E_AUTH_EPOCH: randomUUID(),
    PATH: '/usr/bin:/bin',
  };
}

function fixtureEnvironment(
  paths: ServerPaths,
  agents: AppFixtureAgents,
): NodeJS.ProcessEnv {
  return {
    ARGO_PROJECT_PATH: paths.projectPath,
    ARGO_E2E_AGENTS: JSON.stringify(agents),
    ARGO_E2E_REGISTRY_PATH: paths.registryPath,
    ARGO_E2E_INSTALLATION_PATH: paths.installationPath,
    ARGO_E2E_REQUEST_LOG: path.join(paths.directory, requestLogName),
  };
}

export function launchServer(options: LaunchOptions): ServerProcess {
  return spawn(process.execPath, [engineBundlePath], {
    cwd: serverDirectory,
    env: environment(options),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
