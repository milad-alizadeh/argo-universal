import { type ChildProcess, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';
import { type MockAgents, writeMockAgents } from './mock-agents';
import { createProjectRepository } from './project-repository';

const serverDirectory = path.resolve(import.meta.dirname, '../apps/server');

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
  await createProjectRepository(projectPath);
  await writeMockAgents(agentDirectory, agents);
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
  return { serverUrl: `ws://127.0.0.1:${port}`, httpUrl, stop };
}
