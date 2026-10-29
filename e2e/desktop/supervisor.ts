import { copyFile, mkdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readServerAddress } from '@repo/engine/server-runtime';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { type ChildHandle, startService } from '@repo/process';
import { engineBundlePath } from '../engine-bundle';
import { fixtureEnvironment, serverPaths } from '../own-server-setup';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');

type SupervisorRuntime = { app: string; cli: string };

/*
 * Lays out the shipped app beside a copy of the shipped CLI launcher, whose `server` command finds a Server
 * that runs the real Supervisor with the fixture Engine. Desktop starts it from `app`; a reused Supervisor starts from `cli`.
 */
export async function prepareSupervisorRuntime(
  directory: string,
): Promise<SupervisorRuntime> {
  const runtime = path.join(directory, 'desktop-runtime');
  const app = path.join(runtime, 'app');
  const cli = path.join(runtime, 'cli');
  const server = path.join(runtime, 'server');
  await writeApp(runtime, app);
  await writeServer(server);
  await writeCli(cli, server);

  return { app, cli };
}

// The app's package names the built desktop main; the web export sits beside it.
async function writeApp(runtime: string, app: string): Promise<void> {
  await mkdir(app, { recursive: true });
  await symlink(
    path.join(repositoryRoot, 'apps/universal-app'),
    path.join(runtime, 'universal-app'),
  );
  await writeFile(
    path.join(app, 'package.json'),
    JSON.stringify({
      name: 'argo-desktop-lifecycle',
      main: path.join(repositoryRoot, 'apps/desktop/.vite/build/main.cjs'),
    }),
  );
}

async function writeServer(server: string): Promise<void> {
  await mkdir(path.join(server, 'src'), { recursive: true });
  await writeFile(
    path.join(server, 'package.json'),
    JSON.stringify({ name: '@repo/server', private: true, type: 'module' }),
  );
  await writeFile(
    path.join(server, 'src/main.ts'),
    `import ${JSON.stringify(pathToFileURL(path.join(repositoryRoot, 'apps/server/mocks/e2e-supervisor.ts')).href)};\n`,
  );
  await symlink(
    path.join(repositoryRoot, 'apps/server/node_modules'),
    path.join(server, 'node_modules'),
  );
}

// A copy, not a link: Node resolves a linked launcher's packages beside the original.
async function writeCli(cli: string, server: string): Promise<void> {
  const modules = path.join(cli, 'node_modules');
  await mkdir(path.join(cli, 'bin'), { recursive: true });
  await mkdir(path.join(modules, '@repo'), { recursive: true });
  await mkdir(path.join(modules, '@argo'), { recursive: true });
  await copyFile(
    path.join(repositoryRoot, 'apps/cli/bin/argo.mjs'),
    path.join(cli, 'bin/argo.mjs'),
  );
  await symlink(server, path.join(modules, '@repo/server'));
  await symlink(
    path.join(repositoryRoot, 'packages/plugin-kit'),
    path.join(modules, '@argo/plugin-kit'),
  );
}

type SupervisorEnvironmentInput = {
  directory: string;
  agents: AppFixtureAgents;
  port: number;
};

// The fixture Server's port, Agents and Registry, for the fixture Engine the Supervisor starts.
export const supervisorEnvironment = (
  input: SupervisorEnvironmentInput,
): NodeJS.ProcessEnv => ({
  ...fixtureEnvironment(serverPaths(input.directory), input.agents),
  ARGO_SERVER_PORT: String(input.port),
  ARGO_E2E_ENGINE_ENTRY: engineBundlePath,
});

type SupervisorStart = { cli: string; home: string; env: NodeJS.ProcessEnv };

// Starts a Supervisor the way desktop does, through the CLI's `server` command, and waits for its address.
export async function startSupervisor({
  cli,
  home,
  env,
}: SupervisorStart): Promise<ChildHandle> {
  const supervisor = startService({
    label: 'Supervisor',
    entry: path.join(cli, 'bin/argo.mjs'),
    args: ['server'],
    cwd: cli,
    env,
  });

  return answering(supervisor, home);
}

async function answering(
  supervisor: ChildHandle,
  home: string,
): Promise<ChildHandle> {
  try {
    await supervisor.waitUntil((): true | undefined =>
      readServerAddress(home) ? true : undefined,
    );
  } catch (error) {
    await supervisor.stop();
    throw error;
  }

  return supervisor;
}
