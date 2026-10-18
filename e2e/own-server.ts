import { spawn } from 'node:child_process';
import type { ChildProcessByStdio } from 'node:child_process';
import { chmod, copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { findFreePort } from '@repo/mocks/network/free-port';
import { offlineRegistry } from '@repo/mocks/registry/catalog';
import { scriptedRegistry } from '@repo/mocks/registry/scripted';
import { engineBundlePath } from './engine-bundle';
import { serverHttpUrl, serverUrlFor } from './server-port';
import { hasExited, stderrTailLength, waitUntilReady } from './server-process';

const serverDirectory = path.resolve(import.meta.dirname, '../apps/server');

// The Agents append the ACP requests e2e steps check here, one JSON line each.
export const requestLogName = 'agent-requests.jsonl';

// initTestRepository makes the Server's one Project here.
export const projectDirectoryName = 'project';

export { pollServer } from './server-process';

const attempts = 3;

const portTakenPattern = /EADDRINUSE/;

// What a test reads from its own Server's directory.
type ServerFiles = { projectPath: string; requestLogPath: string };

export const serverFiles = (directory: string): ServerFiles => ({
  projectPath: path.join(directory, projectDirectoryName),
  requestLogPath: path.join(directory, requestLogName),
});

// Starts a real Engine with shared external Agent fixtures in an isolated home.
export async function startOwnServer(
  directory: string,
  agents: AppFixtureAgents,
  initial: { noProjects?: boolean; registryOffline?: boolean } = {},
): Promise<{
  serverUrl: string;
  httpUrl: string;
  registryPath: string;
  installationPath: string;
  stop: () => Promise<void>;
  restart: (whileStopped: () => Promise<void>) => Promise<void>;
}> {
  const projectPath = path.join(directory, projectDirectoryName);
  const home = path.join(directory, 'server-home');
  const fixtureBin = path.join(directory, 'fixture-bin');
  const registryPath = path.join(directory, 'registry.json');
  const installationPath = path.join(directory, 'installation.json');
  await mkdir(directory, { recursive: true });
  await writeFile(
    registryPath,
    JSON.stringify(
      initial.registryOffline
        ? offlineRegistry
        : scriptedRegistry(agents, {
            ARGO_E2E_REQUEST_LOG: path.join(directory, requestLogName),
          }),
    ),
  );
  await writeFile(
    installationPath,
    JSON.stringify({ outcome: 'success', released: true }),
  );
  await initTestRepository(projectPath, false);
  await installFakeGitHubCli(fixtureBin);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const port = await findFreePort();

    const launch = (): ChildProcessByStdio<null, Readable, Readable> =>
      spawn(process.execPath, [engineBundlePath], {
        cwd: serverDirectory,
        env: {
          ...process.env,
          ARGO_HOME: home,
          ARGO_E2E_NO_PROJECTS: initial.noProjects ? '1' : '0',
          ARGO_SERVER_PORT: String(port),
          ARGO_PROJECT_PATH: projectPath,
          ARGO_E2E_AGENTS: JSON.stringify(agents),
          ARGO_E2E_REGISTRY_PATH: registryPath,
          ARGO_E2E_INSTALLATION_PATH: installationPath,
          ARGO_E2E_REQUEST_LOG: path.join(directory, requestLogName),
          PATH: `${fixtureBin}:/usr/bin:/bin`,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

    let server = launch();
    let portTaken = false;
    let stderrTail = '';

    for (const stream of [server.stdout, server.stderr]) {
      stream.on('data', (chunk: Buffer): void => {
        if (portTakenPattern.test(chunk.toString())) portTaken = true;
      });
    }

    server.stderr.on('data', (chunk: Buffer): void => {
      stderrTail = (stderrTail + chunk.toString()).slice(-stderrTailLength);
    });

    const stop = async (): Promise<void> => {
      if (hasExited(server)) return;

      const exited = new Promise((resolve): typeof server =>
        server.once('exit', resolve),
      );

      server.kill('SIGTERM');
      await exited;
    };

    try {
      if (
        await waitUntilReady({
          home,
          port,
          server,
          portTaken: (): boolean => portTaken,
          stderrTail: (): string => stderrTail,
        })
      ) {
        return {
          serverUrl: serverUrlFor(port),
          httpUrl: serverHttpUrl(port),
          registryPath,
          installationPath,
          stop,
          restart: async (whileStopped): Promise<void> => {
            await stop();
            await whileStopped();
            server = launch();
            server.stdout.resume();
            server.stderr.resume();
            await waitUntilReady({
              home,
              port,
              server,
              portTaken: () => false,
              stderrTail: () => '',
            });
          },
        };
      }
    } catch (error) {
      await stop();
      throw error;
    }

    await stop();
  }

  throw new Error(`Another process took the Server's port ${attempts} times`);
}

async function installFakeGitHubCli(directory: string): Promise<void> {
  const executable = path.join(directory, 'gh');
  await mkdir(directory, { recursive: true });
  await copyFile(new URL('./mocks/gh', import.meta.url), executable);
  await chmod(executable, 0o755);
}
