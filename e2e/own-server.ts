import { type ChildProcess, execFile, spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { promisify } from 'node:util';
import { mockClis } from '@repo/mocks/cli';
import type { MockCliOptions } from '@repo/mocks/cli/mock-cli';

const run = promisify(execFile);
const serverDirectory = path.resolve(import.meta.dirname, '../apps/server');

// Each Agent's mock CLI options by Agent id; an Agent left out replays its usual Turn.
export type MockAgents = Record<string, Partial<MockCliOptions>>;

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

// A git repository with one commit on `main`, which the Server seeds as its Project.
async function createProject(directory: string) {
  await mkdir(directory, { recursive: true });
  const git = (...arguments_: string[]) =>
    run('git', ['-C', directory, ...arguments_]);
  await git('init', '--initial-branch=main');
  await git(
    '-c',
    'user.name=Argo',
    '-c',
    'user.email=argo@example.com',
    'commit',
    '--allow-empty',
    '--message=Start',
  );
}

async function waitUntilReady(url: string, server: ChildProcess) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error(`The Server exited with code ${server.exitCode}`);
    const ready = await fetch(`${url}/trpc/system.info`).then(
      (response) => response.ok,
      () => false,
    );
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('The Server did not answer within 30 s');
}

// Starts a Server with its own home, Project and mock Agent CLIs, so a test can change them without touching other tests.
export async function startOwnServer(directory: string, agents: MockAgents) {
  const agentDirectory = path.join(directory, 'agent-bin');
  const projectPath = path.join(directory, 'project');
  await mkdir(agentDirectory, { recursive: true });
  await createProject(projectPath);
  await Promise.all(
    Object.entries(mockClis).map(([agent, mockCli]) =>
      mockCli.write(agentDirectory, {
        recording: mockCli.recordings.turn,
        ...agents[agent],
      }),
    ),
  );
  const port = await findFreePort();
  // No inherited PATH, so a real Agent CLI on this machine never stands in for a missing mock.
  const server = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
    cwd: serverDirectory,
    env: {
      ...process.env,
      ARGO_HOME: path.join(directory, 'server-home'),
      ARGO_SERVER_PORT: String(port),
      ARGO_PROJECT_PATH: projectPath,
      PATH: [agentDirectory, '/usr/bin', '/bin'].join(path.delimiter),
    },
    stdio: 'ignore',
  });
  const httpUrl = `http://127.0.0.1:${port}`;
  const stop = async () => {
    if (server.exitCode !== null) return;
    const exited = new Promise((resolve) => server.once('exit', resolve));
    // SIGTERM lets the supervisor stop the Engine and remove server.json.
    server.kill('SIGTERM');
    await exited;
  };
  try {
    await waitUntilReady(httpUrl, server);
  } catch (error) {
    await stop();
    throw error;
  }
  return {
    serverUrl: `ws://127.0.0.1:${port}`,
    httpUrl,
    projectPath,
    stop,
  };
}
