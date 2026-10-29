import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { findFreePort } from '@repo/mocks/network/free-port';
import { launchServer, type LaunchOptions } from './own-server-launch';
import { prepareServer, type InitialServerOptions } from './own-server-setup';
import { serverHttpUrl, serverUrlFor } from './server-port';
import { hasExited, stderrTailLength, waitUntilReady } from './server-process';

export {
  projectDirectoryName,
  requestLogName,
  serverFiles,
} from './own-server-files';

export { pollServer } from './server-process';

const attempts = 3;

const portTakenPattern = /EADDRINUSE/;

type OwnServer = {
  serverUrl: string;
  httpUrl: string;
  registryPath: string;
  installationPath: string;
  stop: () => Promise<void>;
  restart: (whileStopped: () => Promise<void>) => Promise<void>;
};

// Starts a real Engine with shared external Agent fixtures in an isolated home.
export async function startOwnServer(
  directory: string,
  agents: AppFixtureAgents,
  initial: InitialServerOptions = {},
): Promise<OwnServer> {
  const paths = await prepareServer(directory, agents, initial);

  return tryPorts({ paths, agents, initial });
}

async function tryPorts(
  input: Omit<LaunchOptions, 'port'>,
): Promise<OwnServer> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const port = await findFreePort();
    const server = await startAttempt({ ...input, port });

    if (server) return server;
  }

  throw new Error(`Another process took the Server's port ${attempts} times`);
}

type ServerProcess = ReturnType<typeof launchServer>;

type ProcessHolder = { current: ServerProcess };

type Observation = { portTaken: () => boolean; stderrTail: () => string };

async function stopServer(holder: ProcessHolder): Promise<void> {
  const server = holder.current;

  if (hasExited(server)) return;

  const exited = new Promise((resolve): typeof server =>
    server.once('exit', resolve),
  );

  server.kill('SIGTERM');
  await exited;
}

function monitor(server: ServerProcess): Observation {
  let taken = false;
  let tail = '';

  for (const stream of [server.stdout, server.stderr])
    stream.on('data', (chunk: Buffer): void => {
      if (portTakenPattern.test(chunk.toString())) taken = true;
    });

  server.stderr.on('data', (chunk: Buffer): void => {
    tail = (tail + chunk.toString()).slice(-stderrTailLength);
  });

  return { portTaken: () => taken, stderrTail: () => tail };
}

async function restartServer(
  options: LaunchOptions,
  holder: ProcessHolder,
  whileStopped: () => Promise<void>,
): Promise<void> {
  await stopServer(holder);
  await whileStopped();
  holder.current = launchResumed(options);
  await waitUntilReady(
    readiness(options, holder, {
      portTaken: () => false,
      stderrTail: () => '',
    }),
  );
}

function launchResumed(options: LaunchOptions): ServerProcess {
  const server = launchServer(options);
  server.stdout.resume();
  server.stderr.resume();

  return server;
}

function serverResult(
  options: LaunchOptions,
  holder: ProcessHolder,
): OwnServer {
  return {
    serverUrl: serverUrlFor(options.port),
    httpUrl: serverHttpUrl(options.port),
    registryPath: options.paths.registryPath,
    installationPath: options.paths.installationPath,
    stop: (): Promise<void> => stopServer(holder),
    restart: (whileStopped): Promise<void> =>
      restartServer(options, holder, whileStopped),
  };
}

function readiness(
  options: LaunchOptions,
  holder: ProcessHolder,
  observation: Observation,
): Parameters<typeof waitUntilReady>[0] {
  return {
    home: options.paths.home,
    port: options.port,
    server: holder.current,
    ...observation,
  };
}

async function attemptReady(
  options: LaunchOptions,
  holder: ProcessHolder,
): Promise<boolean> {
  try {
    return await waitUntilReady(
      readiness(options, holder, monitor(holder.current)),
    );
  } catch (error) {
    await stopServer(holder);
    throw error;
  }
}

async function startAttempt(
  options: LaunchOptions,
): Promise<OwnServer | undefined> {
  const holder = { current: launchServer(options) };

  if (await attemptReady(options, holder)) return serverResult(options, holder);
  await stopServer(holder);

  return undefined;
}
