import { join } from 'node:path';
import { supervisorCommand } from '@repo/cli/supervisor-command';
import type { ServerAddress } from '@repo/contracts';
import {
  readServerAddress,
  resolveRuntimeDirectory,
} from '@repo/engine/server-runtime';
import { createRejectionCounter } from '@repo/machine-log';
import {
  type ChildHandle,
  describeExit,
  type Exit,
  isAlive,
  startService,
} from '@repo/process';
import { z } from 'zod';

// One-shot I/O for the Server connection machine; the machine owns every wait.

// ARGO_HOME overrides ~/.argo, as in the Server.
export const resolveHome = resolveRuntimeDirectory;

// server.json when its pid is alive; the Supervisor removes the file when it stops, so a crash can leave one behind.
export function readLiveServerAddress(home: string): ServerAddress | null {
  const address = readServerAddress(home);

  return address && isAlive(address.pid) ? address : null;
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

// A service that outlives this app; utilityProcess has no `detached`.
const launchSupervisor = (paths: SupervisorPaths): ChildHandle =>
  startService(
    supervisorCommand(paths.cliDirectory, { ARGO_HOME: paths.home }),
  );

// A Supervisor that cannot launch, as with no Node in PATH, is reported as one that exited, so its failure offers Retry.
function tryLaunch(
  paths: SupervisorPaths,
  report: SpawnReport,
): ChildHandle | undefined {
  try {
    return launchSupervisor(paths);
  } catch (error) {
    report.exited(error instanceof Error ? error.message : String(error));

    return undefined;
  }
}

function reportMessages(
  child: ChildHandle,
  report: SpawnReport,
  active: () => boolean,
): void {
  const rejections = createRejectionCounter('desktop');

  child.onMessage((message): void => {
    const reportPid = SupervisorStarted.safeParse(message);

    if (!reportPid.success) {
      rejections.report('unrecognised CLI message', message);

      return;
    }

    if (active()) report.spawned(reportPid.data.pid);
  });
}

const exitMessage = (home: string, exit: Exit): string =>
  `The Supervisor exited while starting (${describeExit(exit)}); see ${join(home, 'logs')}`;

// Reports the pids a launched CLI learns, then an exit while the Supervisor starts. The returned function stops reporting.
function followSupervisor(
  child: ChildHandle,
  home: string,
  report: SpawnReport,
): () => void {
  let listening = true;
  reportMessages(child, report, () => listening);

  void child.exited.then((exit): void => {
    if (listening) report.exited(exitMessage(home, exit));
  });

  // Report the CLI pid synchronously so quitting before its Supervisor starts still stops both.
  if (child.pid !== undefined) report.spawned(child.pid);

  return (): void => {
    listening = false;
  };
}

// Starts the CLI and follows it; a CLI that cannot launch is reported as exited. The returned function stops reporting.
export function spawnSupervisor(
  paths: SupervisorPaths,
  report: SpawnReport,
): () => void {
  const child = tryLaunch(paths, report);

  return child ? followSupervisor(child, paths.home, report) : (): void => {};
}
