import { mkdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { engineBundlePath } from '../engine-bundle';
import { serverFiles, type startOwnServer } from '../own-server';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');

// Only startup wiring differs: Electron launches the real Supervisor, which launches the fixture Engine.
export async function prepareSupervisorRuntime(
  directory: string,
): Promise<{ app: string; server: string }> {
  const runtime = path.join(directory, 'desktop-runtime');
  const app = path.join(runtime, 'app');
  const server = path.join(runtime, 'server');
  await mkdir(app, { recursive: true });
  await mkdir(path.join(server, 'src'), { recursive: true });
  await writeAppPackage(app);
  await linkRuntime(runtime, server);
  await writeServerEntry(server);

  return { app, server };
}

async function writeServerEntry(server: string): Promise<void> {
  await writeFile(
    path.join(server, 'src/main.ts'),
    `import ${JSON.stringify(pathToFileURL(path.join(repositoryRoot, 'apps/server/mocks/e2e-supervisor.ts')).href)};\n`,
  );
}

async function writeAppPackage(app: string): Promise<void> {
  await writeFile(
    path.join(app, 'package.json'),
    JSON.stringify({
      name: 'argo-desktop-lifecycle',
      main: path.join(repositoryRoot, 'apps/desktop/.vite/build/main.cjs'),
    }),
  );
}

async function linkRuntime(runtime: string, server: string): Promise<void> {
  await symlink(
    path.join(repositoryRoot, 'apps/server/node_modules'),
    path.join(server, 'node_modules'),
  );
  await symlink(
    path.join(repositoryRoot, 'apps/universal-app'),
    path.join(runtime, 'universal-app'),
  );
}

interface SupervisorEnvironment {
  ARGO_SERVER_PORT: string;
  ARGO_PROJECT_PATH: string;
  ARGO_E2E_AGENTS: string;
  ARGO_E2E_REGISTRY_PATH: string;
  ARGO_E2E_INSTALLATION_PATH: string;
  ARGO_E2E_REQUEST_LOG: string;
  ARGO_E2E_ENGINE_ENTRY: string;
}

interface SupervisorEnvironmentInput {
  directory: string;
  server: Pick<
    Awaited<ReturnType<typeof startOwnServer>>,
    'httpUrl' | 'registryPath' | 'installationPath'
  >;
  agents: AppFixtureAgents;
}

export function ownedSupervisorEnvironment(
  input: SupervisorEnvironmentInput,
): SupervisorEnvironment {
  return {
    ARGO_SERVER_PORT: new URL(input.server.httpUrl).port,
    ARGO_PROJECT_PATH: serverFiles(input.directory).projectPath,
    ARGO_E2E_AGENTS: JSON.stringify(input.agents),
    ARGO_E2E_REGISTRY_PATH: input.server.registryPath,
    ARGO_E2E_INSTALLATION_PATH: input.server.installationPath,
    ARGO_E2E_REQUEST_LOG: serverFiles(input.directory).requestLogPath,
    ARGO_E2E_ENGINE_ENTRY: engineBundlePath,
  };
}
