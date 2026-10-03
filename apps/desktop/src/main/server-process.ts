import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { ServerAddress } from '@repo/contracts';
import { z } from 'zod';
import type {
  ServerHealth,
  ServerLifecycleDependencies,
} from './server-lifecycle';

const ServerHealthResponse = z.object({
  ok: z.literal(true),
  version: z.string(),
  startedAt: z.iso.datetime(),
});
const ServerPackage = z.object({ version: z.string() });

const pollIntervalMs = 200;
const startTimeoutMs = 30_000;
const stopTimeoutMs = 10_000;
const healthTimeoutMs = 1000;

let unrecognisedShapes = 0;
const reportUnrecognised = (source: string, error: z.ZodError) => {
  unrecognisedShapes += 1;
  console.error(
    `desktop: unrecognised ${source} #${unrecognisedShapes}`,
    error.issues,
  );
};

// ARGO_HOME overrides ~/.argo, as in the Server (spec section 5).
export const resolveHome = () =>
  process.env.ARGO_HOME ?? join(homedir(), '.argo');

export async function readServerAddress(
  home: string,
): Promise<ServerAddress | null> {
  let text: string;
  try {
    text = await readFile(join(home, 'server.json'), 'utf8');
  } catch {
    return null;
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    // The supervisor renames a complete file into place, so this is a foreign or damaged file.
    console.error('desktop: server.json is not JSON');
    return null;
  }
  const address = ServerAddress.safeParse(json);
  if (address.success) return address.data;
  reportUnrecognised('server.json', address.error);
  return null;
}

export async function readServerHealth(
  port: number,
): Promise<ServerHealth | null> {
  let json: unknown;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(healthTimeoutMs),
    });
    if (!response.ok) return null;
    json = await response.json();
  } catch {
    return null;
  }
  const health = ServerHealthResponse.safeParse(json);
  if (health.success) return { version: health.data.version };
  reportUnrecognised('/health answer', health.error);
  return null;
}

export async function readServerVersion(serverDirectory: string) {
  const json: unknown = JSON.parse(
    await readFile(join(serverDirectory, 'package.json'), 'utf8'),
  );
  return ServerPackage.parse(json).version;
}

const isRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

export async function stopServer(pid: number) {
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return;
  }
  const deadline = Date.now() + stopTimeoutMs;
  while (isRunning(pid)) {
    if (Date.now() > deadline)
      throw new Error(`The Server (pid ${pid}) did not stop`);
    await delay(pollIntervalMs);
  }
}

// Spawns the supervisor with Node and tsx, detached so it outlives this app; utilityProcess has no `detached`.
export async function startServer(options: {
  home: string;
  serverDirectory: string;
}): Promise<ServerAddress> {
  const { ELECTRON_RUN_AS_NODE: _runAsNode, ...environment } = process.env;
  const child = spawn('node', ['--import', 'tsx', 'src/main.ts'], {
    cwd: options.serverDirectory,
    detached: true,
    stdio: 'ignore',
    env: { ...environment, ARGO_HOME: options.home },
  });
  child.unref();
  const spawned = new Promise<number>((resolve, reject) => {
    child.once('spawn', () => resolve(child.pid ?? 0));
    child.once('error', reject);
  });
  const pid = await spawned;

  const deadline = Date.now() + startTimeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error(
        `The Server exited while starting (${child.exitCode ?? child.signalCode}); see ${join(options.home, 'logs')}`,
      );
    const address = await readServerAddress(options.home);
    if (address?.pid === pid && (await readServerHealth(address.port)))
      return address;
    await delay(pollIntervalMs);
  }
  throw new Error(`The Server (pid ${pid}) did not answer in time`);
}

export function createServerProcessDependencies(options: {
  home: string;
  serverDirectory: string;
  version: string;
}): ServerLifecycleDependencies {
  return {
    version: options.version,
    readAddress: () => readServerAddress(options.home),
    readHealth: readServerHealth,
    start: () => startServer(options),
    stop: stopServer,
  };
}
