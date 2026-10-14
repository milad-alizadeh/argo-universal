import { spawn } from 'node:child_process';
import type { ChildProcessByStdio } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { findFreePort } from '@repo/mocks/network/free-port';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { engineBundlePath } from './engine-bundle';
import { serverHttpUrl, serverUrlFor } from './server-port';
import { hasExited, stderrTailLength, waitUntilReady } from './server-process';

const serverDirectory = path.resolve(import.meta.dirname, '../apps/server');

// The Agents append the ACP requests e2e steps check here, one JSON line each.
export const requestLogName = 'agent-requests.jsonl';

// initTestRepository makes the Server's one Project here.
export const projectDirectoryName = 'project';

// The one directory on the Server's PATH besides system tools: an Agent installed outside Argo goes here.
const machineDirectoryName = 'machine';

export { pollServer } from './server-process';

const attempts = 3;

const portTakenPattern = /EADDRINUSE/;

// What a test reads from its own Server's directory.
type ServerFiles = {
  projectPath: string;
  requestLogPath: string;
  machinePath: string;
};

export const serverFiles = (directory: string): ServerFiles => ({
  projectPath: path.join(directory, projectDirectoryName),
  machinePath: path.join(directory, machineDirectoryName),
  requestLogPath: path.join(directory, requestLogName),
});

// Starts a real Engine with shared external Agent fixtures in an isolated home.
export async function startOwnServer(
  directory: string,
  agents: AppFixtureAgents,
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
  const registryPath = path.join(directory, 'registry.json');
  const installationPath = path.join(directory, 'installation.json');
  const heldCheckRelease = path.join(directory, 'release-held-checks');
  const machinePath = path.join(directory, machineDirectoryName);
  await mkdir(machinePath, { recursive: true });
  await writeFile(registryPath, JSON.stringify(publishedRegistry));
  await writeFile(
    installationPath,
    JSON.stringify({ outcome: 'success', released: true }),
  );
  await initTestRepository(projectPath, false);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const port = await findFreePort();

    const launch = (): ChildProcessByStdio<null, Readable, Readable> =>
      spawn(process.execPath, [engineBundlePath], {
        cwd: serverDirectory,
        env: {
          ...process.env,
          ARGO_HOME: home,
          ARGO_SERVER_PORT: String(port),
          ARGO_PROJECT_PATH: projectPath,
          ARGO_E2E_AGENTS: JSON.stringify(agents),
          ARGO_E2E_REGISTRY_PATH: registryPath,
          ARGO_E2E_INSTALLATION_PATH: installationPath,
          ARGO_E2E_REQUEST_LOG: path.join(directory, requestLogName),
          ARGO_E2E_HELD_CHECK_RELEASE: heldCheckRelease,
          PATH: [machinePath, '/usr/bin', '/bin'].join(path.delimiter),
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
      // A held readiness check answers now, so the Server can stop.
      await writeFile(heldCheckRelease, '');

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
            await rm(heldCheckRelease, { force: true });
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
