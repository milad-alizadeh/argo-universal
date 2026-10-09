import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ServerAddress } from '@repo/contracts';
import { resolveRuntimeDirectory } from '@repo/engine/server-runtime';
import type { z } from 'zod';

// One-shot I/O for the Server connection machine; the machine owns every wait.

let unrecognisedShapes = 0;
const reportUnrecognised = (source: string, error: z.ZodError): void => {
  unrecognisedShapes += 1;
  console.error(
    `desktop: unrecognised ${source} #${unrecognisedShapes}`,
    error.issues,
  );
};

// ARGO_HOME overrides ~/.argo, as in the Server.
export const resolveHome = resolveRuntimeDirectory;

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

export const isRunning = (pid: number): boolean => {
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
export function signalSupervisor(pid: number): void {
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // It has already exited.
  }
}

// Where the Supervisor keeps its state, and apps/server, which `spawnSupervisor` runs.
export interface SupervisorPaths {
  home: string;
  serverDirectory: string;
}

export interface SpawnReport {
  spawned: (pid: number) => void;
  exited: (reason: string) => void;
}

// Spawns the Supervisor with Node and tsx, detached so it outlives this app; utilityProcess has no `detached`. The returned function stops reporting.
export function spawnSupervisor(
  paths: SupervisorPaths,
  report: SpawnReport,
): () => void {
  let listening = true;
  const { ELECTRON_RUN_AS_NODE: _runAsNode, ...environment } = process.env;
  const child = spawn('node', ['--import', 'tsx', 'src/main.ts'], {
    cwd: paths.serverDirectory,
    detached: true,
    stdio: 'ignore',
    env: { ...environment, ARGO_HOME: paths.home },
  });
  child.unref();
  child.once('error', (error): void => {
    if (listening) report.exited(`The Supervisor could not start: ${error}`);
  });
  child.once('exit', (code, signal): void => {
    if (listening)
      report.exited(
        `The Supervisor exited while starting (${code ?? signal}); see ${join(paths.home, 'logs')}`,
      );
  });
  // The pid exists once `spawn` returns; its `spawn` event only follows a tick later, too late for a quit in between.
  if (child.pid !== undefined) report.spawned(child.pid);
  return (): void => {
    listening = false;
  };
}
