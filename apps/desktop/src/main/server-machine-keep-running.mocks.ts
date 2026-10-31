import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { supervisorStopGraceMs } from '@repo/cli/supervisor-command';
import type { AppRouter } from '@repo/engine/router';
import { startLimitMs, stopProcess } from '@repo/process';
import { createTRPCClient, createWSClient, wsLink } from '@trpc/client';
import { afterEach, beforeEach, vi } from 'vitest';
import { type Actor, createActor, waitFor } from 'xstate';
import { serverConnectionMachine } from './server-machine';
import { watchCountsDouble } from './server-machine-data.mocks';
import { readLiveServerAddress } from './server-process';

// The real Supervisor and the real Server, as a launch of the desktop app meets them.
let home: string;

let port: number;

const cliDirectory = fileURLToPath(new URL('../../../cli/', import.meta.url));

const supervisors: number[] = [];

async function availablePort(): Promise<number> {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const address = probe.address();
  probe.close();

  if (!address || typeof address === 'string') throw new Error('No test port');

  return address.port;
}

beforeEach(async (): Promise<void> => {
  home = mkdtempSync(join(tmpdir(), 'desktop-keep-running-'));
  port = await availablePort();
  vi.stubEnv('ARGO_SERVER_PORT', String(port));
});

// Every launch is stopped, and every process it or the test started, whether or not the launch got as far as `ready`.
const launches: Actor<typeof serverConnectionMachine>[] = [];

// An Engine too slow to answer: its Connection reports no counts and never answers the question to keep running.
export const slowEngine = serverConnectionMachine.provide({
  actors: { watchCounts: watchCountsDouble },
});

// Everything the test started and may have left running, found or not.
const leftRunning = (): number[] => {
  const live = readLiveServerAddress(home)?.pid;

  return live === undefined ? supervisors : [...supervisors, live];
};

afterEach(async (): Promise<void> => {
  for (const launch of launches) launch.stop();
  launches.length = 0;
  await Promise.all(
    leftRunning().map((pid) => stopProcess(pid, supervisorStopGraceMs)),
  );
  supervisors.length = 0;
  vi.unstubAllEnvs();
  rmSync(home, { recursive: true, force: true });
});

export interface Launch {
  quit: () => Promise<void>;
  ownedPid: () => number | null;
  serverPid: () => number;
  // Whether the launch ever started a Supervisor of its own, even one that lost a race and exited.
  startedASupervisor: () => boolean;
}

// A Supervisor the launch spawned is stopped even if the launch never reached `ready`.
const rememberOwned = (pid: number | null): void => {
  if (pid !== null && !supervisors.includes(pid)) supervisors.push(pid);
};

type Machine = typeof serverConnectionMachine;

interface Watched {
  app: Actor<Machine>;
  started: () => boolean;
}

// Starts the machine, noting whether it ever began a Supervisor and which Supervisors it owned.
function startWatched(machine: Machine): Watched {
  const app = createActor(machine, {
    input: { home, cliDirectory, askToKeepSessions: async () => false },
  });

  let started = false;

  launches.push(app);
  app.subscribe((snapshot): void => {
    started ||= snapshot.matches('starting');
    rememberOwned(snapshot.context.ownedPid);
  });
  app.start();

  return { app, started: () => started };
}

async function serverPidOf(app: Actor<Machine>): Promise<number> {
  const ready = await waitFor(app, (snapshot) => snapshot.matches('ready'), {
    timeout: startLimitMs,
  });

  const pid = ready.context.address?.pid;

  if (pid === undefined) throw new Error('The Server has no address');
  supervisors.push(pid);

  return pid;
}

const quitAndWait = async (app: Actor<Machine>): Promise<void> => {
  app.send({ type: 'app.quit' });
  await waitFor(app, (snapshot) => snapshot.status === 'done', {
    timeout: 10_000,
  });
};

// A launch of the desktop app: it finds or starts a Server, and `quit` is what Cmd+Q does.
export async function launchApp(machine: Machine): Promise<Launch> {
  const { app, started } = startWatched(machine);
  const pid = await serverPidOf(app);

  return {
    quit: (): Promise<void> => quitAndWait(app),
    ownedPid: () => app.getSnapshot().context.ownedPid,
    serverPid: () => pid,
    startedASupervisor: started,
  };
}

type Client = ReturnType<typeof createTRPCClient<AppRouter>>;

const clientOf = (socket: ReturnType<typeof createWSClient>): Client =>
  createTRPCClient<AppRouter>({
    links: [wsLink<AppRouter>({ client: socket })],
  });

// What another App sees: whether the Server answers, and which process answers.
export async function askServer<TResult>(
  ask: (client: Client) => Promise<TResult>,
): Promise<TResult> {
  const socket = createWSClient({ url: `ws://127.0.0.1:${port}` });

  try {
    return await ask(clientOf(socket));
  } finally {
    void socket.close();
  }
}
