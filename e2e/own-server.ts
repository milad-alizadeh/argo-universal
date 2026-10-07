import { type ChildProcess, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { z } from 'zod';
import { type MockAgents, writeMockAgents } from './mock-agents';
import { createProjectRepository } from './project-repository';

const serverDirectory = path.resolve(import.meta.dirname, '../apps/server');

export const serverUrlFor = (port: number | string) => `ws://127.0.0.1:${port}`;

export const findFreePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() =>
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
async function waitUntilReady(
  home: string,
  port: number,
  server: ChildProcess,
  portTaken: () => boolean,
  stderrTail: () => string,
) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (hasExited(server))
      throw new Error(`${describeExit(server)}${withStderr(stderrTail())}`);
    if (portTaken()) return false;
    const text = await readFile(path.join(home, 'server.json'), 'utf8').catch(
      () => null,
    );
    if (text !== null && ServerFile.parse(JSON.parse(text)).port === port)
      return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(
    `The Server did not start within 30 s${withStderr(stderrTail())}`,
  );
}

const hasExited = (server: ChildProcess) =>
  server.exitCode !== null || server.signalCode !== null;

const describeExit = (server: ChildProcess) =>
  server.signalCode === null
    ? `The Server exited with code ${server.exitCode}`
    : `The Server exited with signal ${server.signalCode}`;

const withStderr = (tail: string) =>
  tail === ''
    ? ''
    : `\nServer stderr (last ${STDERR_TAIL_LENGTH} characters):\n${tail}`;

// Starts a Server with its own home, Project and mock Agent CLIs, so a test can change them without touching other tests.
export async function startOwnServer(directory: string, agents: MockAgents) {
  const agentDirectory = path.join(directory, 'agent-bin');
  const projectPath = path.join(directory, 'project');
  const home = path.join(directory, 'server-home');
  await createProjectRepository(projectPath);
  await writeMockAgents(agentDirectory, agents);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const port = await findFreePort();
    // No inherited PATH, so a real Agent CLI on this machine never stands in for a missing mock.
    const server = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
      cwd: serverDirectory,
      env: {
        ...process.env,
        ARGO_HOME: home,
        ARGO_SERVER_PORT: String(port),
        ARGO_PROJECT_PATH: projectPath,
        PATH: [agentDirectory, '/usr/bin', '/bin'].join(path.delimiter),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // Another process can take the port between findFreePort and the Engine's listen; the Supervisor then retries it forever.
    let portTaken = false;
    let stderrTail = '';
    for (const stream of [server.stdout, server.stderr]) {
      stream.on('data', (chunk: Buffer) => {
        if (portTakenPattern.test(chunk.toString())) portTaken = true;
      });
    }
    server.stderr.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_TAIL_LENGTH);
    });
    const stop = async () => {
      if (hasExited(server)) return;
      const exited = new Promise((resolve) => server.once('exit', resolve));
      // SIGTERM lets the supervisor stop the Engine and remove server.json.
      server.kill('SIGTERM');
      await exited;
    };
    try {
      if (
        await waitUntilReady(
          home,
          port,
          server,
          () => portTaken,
          () => stderrTail,
        )
      ) {
        return {
          serverUrl: serverUrlFor(port),
          httpUrl: `http://127.0.0.1:${port}`,
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
