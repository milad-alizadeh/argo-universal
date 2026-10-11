import { type ChildProcess, spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readServerAddress } from '@repo/engine/server-runtime';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { findFreePort } from '@repo/mocks/network/free-port';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { serverHttpUrl, serverUrlFor } from './server-port';

const serverDirectory = path.resolve(import.meta.dirname, '../apps/server');
const fixtureEngineArguments = ['--import', 'tsx', 'mocks/e2e-engine.ts'];

const serverStartMilliseconds = 30_000;
const serverPollMilliseconds = 200;

// Poll until the Server starts or its startup deadline expires.
export async function pollServer<T>(
  check: () => Promise<T | undefined>,
  timeoutMessage: (seconds: number) => string,
): Promise<NonNullable<Awaited<T>> | (Awaited<T> & null)> {
  const deadline = Date.now() + serverStartMilliseconds;
  while (Date.now() < deadline) {
    const result = await check();
    if (result !== undefined) return result;
    await new Promise((resolve): NodeJS.Timeout =>
      setTimeout(resolve, serverPollMilliseconds),
    );
  }
  throw new Error(timeoutMessage(serverStartMilliseconds / 1000));
}

const portTakenPattern = /EADDRINUSE/;
const attempts = 3;
const STDERR_TAIL_LENGTH = 2000;

// Only the Server in this isolated home can satisfy readiness.
async function waitUntilReady({
  home,
  port,
  server,
  portTaken,
  stderrTail,
}: {
  home: string;
  port: number;
  server: ChildProcess;
  portTaken: () => boolean;
  stderrTail: () => string;
}): Promise<boolean> {
  return pollServer(
    async (): Promise<boolean | undefined> => {
      if (hasExited(server))
        throw new Error(`${describeExit(server)}${withStderr(stderrTail())}`);
      if (portTaken()) return false;
      if (readServerAddress(home)?.port === port) return true;
      return;
    },
    (seconds): string =>
      `The Server did not start within ${seconds} s${withStderr(stderrTail())}`,
  );
}

const hasExited = (server: ChildProcess): boolean =>
  server.exitCode !== null || server.signalCode !== null;

const describeExit = (server: ChildProcess): string =>
  server.signalCode === null
    ? `The Server exited with code ${server.exitCode}`
    : `The Server exited with signal ${server.signalCode}`;

const withStderr = (tail: string): string =>
  tail === ''
    ? ''
    : `\nServer stderr (last ${STDERR_TAIL_LENGTH} characters):\n${tail}`;

// Starts a real Engine with shared external Agent fixtures in an isolated home.
export async function startOwnServer(
  directory: string,
  agents: AppFixtureAgents,
): Promise<{
  serverUrl: string;
  httpUrl: string;
  registryPath: string;
  stop: () => Promise<void>;
}> {
  const projectPath = path.join(directory, 'project');
  const home = path.join(directory, 'server-home');
  const registryPath = path.join(directory, 'registry.json');
  await mkdir(directory, { recursive: true });
  await writeFile(registryPath, JSON.stringify(publishedRegistry));
  await initTestRepository(projectPath, false);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const port = await findFreePort();
    const server = spawn(process.execPath, fixtureEngineArguments, {
      cwd: serverDirectory,
      env: {
        ...process.env,
        ARGO_HOME: home,
        ARGO_SERVER_PORT: String(port),
        ARGO_PROJECT_PATH: projectPath,
        ARGO_E2E_AGENTS: JSON.stringify(agents),
        ARGO_E2E_REGISTRY_PATH: registryPath,
        PATH: '/usr/bin:/bin',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let portTaken = false;
    let stderrTail = '';
    for (const stream of [server.stdout, server.stderr]) {
      stream.on('data', (chunk: Buffer): void => {
        if (portTakenPattern.test(chunk.toString())) portTaken = true;
      });
    }
    server.stderr.on('data', (chunk: Buffer): void => {
      stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_TAIL_LENGTH);
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
          stop,
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
