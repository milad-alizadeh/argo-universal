import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ServerAddress } from '@repo/contracts';
import type { z } from 'zod';

// One-shot I/O for the Server connection machine; the machine owns every wait (spec 0002 section 10).

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

async function readServerAddress(home: string): Promise<ServerAddress | null> {
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

export const isRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

// server.json when its pid is alive; the Supervisor removes the file when it stops, so a crash can leave one behind.
export async function readLiveServerAddress(
  home: string,
): Promise<ServerAddress | null> {
  const address = await readServerAddress(home);
  return address && isRunning(address.pid) ? address : null;
}

// Asks the Supervisor to stop; one that has already exited needs nothing.
export function signalServer(pid: number) {
  try {
    process.kill(pid, 'SIGTERM');
  } catch {}
}

export interface SpawnReport {
  spawned: (pid: number) => void;
  exited: (reason: string) => void;
}

// Spawns the Supervisor with Node and tsx, detached so it outlives this app; utilityProcess has no `detached`. The returned function stops reporting.
export function spawnServer(
  options: { home: string; serverDirectory: string },
  report: SpawnReport,
): () => void {
  let listening = true;
  const { ELECTRON_RUN_AS_NODE: _runAsNode, ...environment } = process.env;
  const child = spawn('node', ['--import', 'tsx', 'src/main.ts'], {
    cwd: options.serverDirectory,
    detached: true,
    stdio: 'ignore',
    env: { ...environment, ARGO_HOME: options.home },
  });
  child.unref();
  child.once('spawn', () => {
    if (child.pid === undefined) return;
    // Nobody listens any more, so nobody else knows this pid to stop it.
    if (!listening) signalServer(child.pid);
    else report.spawned(child.pid);
  });
  child.once('error', (error) => {
    if (listening) report.exited(`The Server could not start: ${error}`);
  });
  child.once('exit', (code, signal) => {
    if (listening)
      report.exited(
        `The Server exited while starting (${code ?? signal}); see ${join(options.home, 'logs')}`,
      );
  });
  return () => {
    listening = false;
  };
}
