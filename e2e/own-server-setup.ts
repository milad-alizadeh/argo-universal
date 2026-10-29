import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { offlineRegistry } from '@repo/mocks/registry/catalog';
import { scriptedRegistry } from '@repo/mocks/registry/scripted';

export type InitialServerOptions = {
  noProjects?: boolean;
  registryOffline?: boolean;
};

export type ServerPaths = {
  directory: string;
  // initTestRepository makes the Server's one Project here.
  projectPath: string;
  // The Agents append the ACP requests e2e steps check here, one JSON line each.
  requestLogPath: string;
  home: string;
  registryPath: string;
  installationPath: string;
};

export function serverPaths(directory: string): ServerPaths {
  return {
    directory,
    projectPath: path.join(directory, 'project'),
    requestLogPath: path.join(directory, 'agent-requests.jsonl'),
    home: path.join(directory, 'server-home'),
    registryPath: path.join(directory, 'registry.json'),
    installationPath: path.join(directory, 'installation.json'),
  };
}

type ServerFiles = Pick<ServerPaths, 'projectPath' | 'requestLogPath'>;

// The files App steps read beside the Server.
export function serverFiles(directory: string): ServerFiles {
  const { projectPath, requestLogPath } = serverPaths(directory);

  return { projectPath, requestLogPath };
}

// The external Agent and Registry fixtures, for an Engine started alone or by a Supervisor.
export function fixtureEnvironment(
  paths: ServerPaths,
  agents: AppFixtureAgents,
): NodeJS.ProcessEnv {
  return {
    ARGO_PROJECT_PATH: paths.projectPath,
    ARGO_E2E_AGENTS: JSON.stringify(agents),
    ARGO_E2E_REGISTRY_PATH: paths.registryPath,
    ARGO_E2E_INSTALLATION_PATH: paths.installationPath,
    ARGO_E2E_REQUEST_LOG: paths.requestLogPath,
  };
}

async function writeRegistry(
  paths: ServerPaths,
  agents: AppFixtureAgents,
  initial: InitialServerOptions,
): Promise<void> {
  const registry = initial.registryOffline
    ? offlineRegistry
    : scriptedRegistry(agents, { ARGO_E2E_REQUEST_LOG: paths.requestLogPath });

  await writeFile(paths.registryPath, JSON.stringify(registry));
}

export async function prepareServer(
  directory: string,
  agents: AppFixtureAgents,
  initial: InitialServerOptions,
): Promise<ServerPaths> {
  const paths = serverPaths(directory);
  await mkdir(directory, { recursive: true });
  await writeRegistry(paths, agents, initial);
  await writeInstallation(paths.installationPath);
  await initTestRepository(paths.projectPath, false);
  await installPlugins(paths.home);

  return paths;
}

async function installPlugins(home: string): Promise<void> {
  await cp(
    new URL('./mocks/plugins', import.meta.url),
    path.join(home, 'shipped-plugins'),
    { recursive: true },
  );
}

async function writeInstallation(path: string): Promise<void> {
  await writeFile(path, JSON.stringify({ outcome: 'success', released: true }));
}
