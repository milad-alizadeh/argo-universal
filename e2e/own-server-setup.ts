import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { offlineRegistry } from '@repo/mocks/registry/catalog';
import { scriptedRegistry } from '@repo/mocks/registry/scripted';
import { projectDirectoryName, requestLogName } from './own-server-files';

export type InitialServerOptions = {
  noProjects?: boolean;
  registryOffline?: boolean;
};

export type ServerPaths = {
  directory: string;
  projectPath: string;
  home: string;
  registryPath: string;
  installationPath: string;
};

function serverPaths(directory: string): ServerPaths {
  return {
    directory,
    projectPath: path.join(directory, projectDirectoryName),
    home: path.join(directory, 'server-home'),
    registryPath: path.join(directory, 'registry.json'),
    installationPath: path.join(directory, 'installation.json'),
  };
}

async function writeRegistry(
  paths: ServerPaths,
  agents: AppFixtureAgents,
  initial: InitialServerOptions,
): Promise<void> {
  const registry = initial.registryOffline
    ? offlineRegistry
    : scriptedRegistry(agents, {
        ARGO_E2E_REQUEST_LOG: path.join(paths.directory, requestLogName),
      });

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
