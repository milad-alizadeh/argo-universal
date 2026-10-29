import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type { ServerAddress } from '@repo/contracts';
import {
  readServerAddress,
  resolveExecutable,
  resolveRuntimeDirectory,
} from '@repo/engine/server-runtime';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';

// One-shot I/O for the Server connection machine; the machine owns every wait.

// ARGO_HOME overrides ~/.argo, as in the Server.
export const resolveHome = resolveRuntimeDirectory;

export const isRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
};

// server.json when its pid is alive; the Supervisor removes the file when it stops, so a crash can leave one behind.
export function readLiveServerAddress(home: string): ServerAddress | null {
  const address = readServerAddress(home);

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

// Where the Supervisor keeps its state, and apps/cli, which `spawnSupervisor` runs.
export interface SupervisorPaths {
  home: string;
  cliDirectory: string;
}

export interface SpawnReport {
  spawned: (pid: number) => void;
  exited: (reason: string) => void;
}

const SupervisorStarted = z.object({
  type: z.literal('supervisor.spawned'),
  pid: z.number().int().positive(),
});

function launchSupervisor(paths: SupervisorPaths): ReturnType<typeof spawn> {
  const environment: NodeJS.ProcessEnv = { ...process.env };
  delete environment.ELECTRON_RUN_AS_NODE;

  return spawn(
    resolveExecutable('node'),
    [join(paths.cliDirectory, 'bin/argo.mjs'), 'server'],
    {
      cwd: paths.cliDirectory,
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      env: { ...environment, ARGO_HOME: paths.home },
    },
  );
}

function reportMessages(
  child: ReturnType<typeof spawn>,
  report: SpawnReport,
  active: () => boolean,
): void {
  const rejections = createRejectionCounter('desktop');

  child.on('message', (message): void => {
    const reportPid = SupervisorStarted.safeParse(message);

    if (!reportPid.success) {
      rejections.report('unrecognised CLI message', message);

      return;
    }

    if (active()) report.spawned(reportPid.data.pid);
  });
}

type ExitObserver = {
  paths: SupervisorPaths;
  report: SpawnReport;
  active: () => boolean;
};

function reportExit(
  child: ReturnType<typeof spawn>,
  { paths, report, active }: ExitObserver,
): void {
  child.once('error', (error): void => {
    if (active()) report.exited(`The Supervisor could not start: ${error}`);
  });
  child.once('exit', (code, signal): void => {
    if (active()) report.exited(exitMessage(paths.home, code ?? signal));
  });
}

function exitMessage(home: string, result: number | string | null): string {
  return `The Supervisor exited while starting (${result}); see ${join(home, 'logs')}`;
}

// Spawns the CLI with Node, detached so it outlives this app; utilityProcess has no `detached`. The returned function stops reporting.
export function spawnSupervisor(
  paths: SupervisorPaths,
  report: SpawnReport,
): () => void {
  const child = launchSupervisor(paths);
  let listening = true;
  child.unref();
  child.channel?.unref();
  reportMessages(child, report, () => listening);
  reportExit(child, { paths, report, active: () => listening });

  // Report the CLI pid synchronously so quitting before its Supervisor starts still stops both.
  if (child.pid !== undefined) report.spawned(child.pid);

  return (): void => {
    listening = false;
  };
}
