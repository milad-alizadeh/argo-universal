import { type ChildProcess, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { z } from 'zod';
import { type MockAgents, mockAgentPath, writeMockAgents } from './mock-agents';
import { createProjectRepository } from './project-repository';

const serverDirectory = path.resolve(import.meta.dirname, '../apps/server');

const serverHost = '127.0.0.1';
const serverUrlFor = (port: number): string => `ws://${serverHost}:${port}`;
export const serverHttpUrl = (port: number): string =>
  `http://${serverHost}:${port}`;
const serverStartMilliseconds = 30_000;
const serverPollMilliseconds = 200;

// Polls `check` until it settles on a value, and throws `timeoutMessage` once a Server has had its whole start time.
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

export const findFreePort = (): Promise<number> =>
  new Promise<number>((resolve, reject): void => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, serverHost, (): void => {
      const address = server.address();
      server.close((): void =>
        typeof address === 'object' && address
          ? resolve(address.port)
          : reject(new Error('No free port')),
      );
    });
  });

const ServerFile = z.object({ port: z.int() });
const portTakenPattern = /EADDRINUSE/;
const attempts = 3;
const STDERR_TAIL_LENGTH = 2000;

// Ready once this Server's own home names its port; another run's Server on a shared port never counts.
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
      const text = await readFile(path.join(home, 'server.json'), 'utf8').catch(
        (): null => null,
      );
      if (text !== null && ServerFile.parse(JSON.parse(text)).port === port)
        return true;
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

// Starts a Server with its own home, Project and mock Agent CLIs, so a test can change them without touching other tests.
export async function startOwnServer(
  directory: string,
  agents: MockAgents,
): Promise<{ serverUrl: string; httpUrl: string; stop: () => Promise<void> }> {
  const agentDirectory = path.join(directory, 'agent-bin');
  const projectPath = path.join(directory, 'project');
  const home = path.join(directory, 'server-home');
  await createProjectRepository(projectPath);
  await writeMockAgents(agentDirectory, agents);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const port = await findFreePort();
    const server = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
      cwd: serverDirectory,
      env: {
        ...process.env,
        ARGO_HOME: home,
        ARGO_SERVER_PORT: String(port),
        ARGO_PROJECT_PATH: projectPath,
        PATH: mockAgentPath(agentDirectory),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // Another process can take the port between findFreePort and the Engine's listen; the Supervisor then retries it forever.
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
      // SIGTERM lets the supervisor stop the Engine and remove server.json.
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
