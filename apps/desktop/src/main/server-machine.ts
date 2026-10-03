import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { ServerAddress } from '@repo/contracts';
import {
  type ActorRef,
  assign,
  enqueueActions,
  fromPromise,
  type Snapshot,
  setup,
} from 'xstate';
import type { z } from 'zod';

const pollIntervalMs = 200;
const startTimeoutMs = 30_000;
const stopTimeoutMs = 10_000;

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

const isRunning = (pid: number) => {
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

async function stopServer(pid: number) {
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

// Spawns the Supervisor with Node and tsx, detached so it outlives this app; utilityProcess has no `detached`.
async function startServer(
  options: ServerInput,
  onSpawn: (pid: number) => void,
  signal: AbortSignal,
): Promise<ServerAddress> {
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
  // Quit came before the spawn, so nobody else knows this pid to stop it.
  if (signal.aborted) {
    await stopServer(pid);
    throw signal.reason;
  }
  onSpawn(pid);

  // The Supervisor writes server.json once its Engine listens.
  const deadline = Date.now() + startTimeoutMs;
  while (Date.now() < deadline) {
    signal.throwIfAborted();
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error(
        `The Server exited while starting (${child.exitCode ?? child.signalCode}); see ${join(options.home, 'logs')}`,
      );
    const address = await readServerAddress(options.home);
    if (address?.pid === pid) return address;
    await delay(pollIntervalMs);
  }
  throw new Error(`The Server (pid ${pid}) did not answer in time`);
}

export interface ServerInput {
  home: string;
  // apps/server, which `start` runs.
  serverDirectory: string;
}

interface ServerContext extends ServerInput {
  address: ServerAddress | null;
  // The Supervisor this app started, which it stops on quit.
  ownedPid: number | null;
  failure: string | null;
}

type ServerSpawned = { type: 'server.spawned'; pid: number };
type ServerEvent =
  | ServerSpawned
  | { type: 'server.retry' }
  | { type: 'app.quit' };

export type ServerEmitted = { type: 'server.ready'; address: ServerAddress };

export interface StartInput extends ServerInput {
  parent: ActorRef<Snapshot<unknown>, ServerSpawned>;
}

export interface StopInput {
  pid: number;
}

// Spec 0002 section 10: Electron makes sure a Supervisor runs, and on quit stops only one that it started.
export const serverConnectionMachine = setup({
  types: {
    input: {} as ServerInput,
    context: {} as ServerContext,
    events: {} as ServerEvent,
    emitted: {} as ServerEmitted,
  },
  actors: {
    // The Supervisor in server.json, if its pid is alive; of any version until release packaging checks it.
    readAddress: fromPromise<ServerAddress | null, ServerInput>(({ input }) =>
      readLiveServerAddress(input.home),
    ),
    start: fromPromise<ServerAddress, StartInput>(({ input, signal }) =>
      startServer(
        input,
        (pid) => input.parent.send({ type: 'server.spawned', pid }),
        signal,
      ),
    ),
    stop: fromPromise<void, StopInput>(({ input }) => stopServer(input.pid)),
  },
  actions: {
    // The main process opens the window with this address.
    announceReady: enqueueActions(({ context, enqueue }) => {
      if (context.address)
        enqueue.emit({ type: 'server.ready', address: context.address });
    }),
    log: (_, params: { line: string }) => {
      console.error(`desktop: ${params.line}`);
    },
  },
  guards: {
    foundAddress: (_, params: { address: ServerAddress | null }) =>
      params.address !== null,
    ownsSupervisor: ({ context }) => context.ownedPid !== null,
  },
  delays: { stopLimit: 5000 },
}).createMachine({
  id: 'serverConnection',
  context: ({ input }) => ({
    ...input,
    address: null,
    ownedPid: null,
    failure: null,
  }),
  initial: 'locating',
  on: {
    'app.quit': [
      { guard: 'ownsSupervisor', target: '.stopping' },
      { target: '.stopped' },
    ],
  },
  states: {
    locating: {
      invoke: {
        id: 'readAddress',
        src: 'readAddress',
        input: ({ context }) => ({
          home: context.home,
          serverDirectory: context.serverDirectory,
        }),
        onDone: [
          {
            guard: {
              type: 'foundAddress',
              params: ({ event }) => ({ address: event.output }),
            },
            target: 'ready',
            actions: assign({ address: ({ event }) => event.output }),
          },
          { target: 'starting' },
        ],
        onError: {
          target: 'failed',
          actions: assign({
            failure: ({ event }) =>
              `could not read server.json: ${String(event.error)}`,
          }),
        },
      },
    },
    starting: {
      invoke: {
        id: 'start',
        src: 'start',
        input: ({ context, self }) => ({
          home: context.home,
          serverDirectory: context.serverDirectory,
          parent: self,
        }),
        onDone: {
          target: 'ready',
          actions: assign({ address: ({ event }) => event.output }),
        },
        onError: [
          {
            guard: 'ownsSupervisor',
            target: 'abandoning',
            actions: assign({ failure: ({ event }) => String(event.error) }),
          },
          {
            target: 'failed',
            actions: assign({ failure: ({ event }) => String(event.error) }),
          },
        ],
      },
      on: {
        'server.spawned': {
          actions: assign({ ownedPid: ({ event }) => event.pid }),
        },
      },
    },
    // Stops the Supervisor that failed to start, so a Retry begins from nothing.
    abandoning: {
      invoke: {
        id: 'stop',
        src: 'stop',
        input: ({ context }) => ({ pid: context.ownedPid ?? 0 }),
        onDone: { target: 'failed', actions: assign({ ownedPid: null }) },
        onError: {
          target: 'failed',
          actions: {
            type: 'log',
            params: ({ event }) => ({
              line: `could not stop the Supervisor it started: ${String(event.error)}`,
            }),
          },
        },
      },
    },
    ready: { entry: 'announceReady' },
    failed: {
      on: {
        'server.retry': {
          target: 'locating',
          actions: assign({ failure: null }),
        },
      },
    },
    stopping: {
      invoke: {
        id: 'stop',
        src: 'stop',
        input: ({ context }) => ({ pid: context.ownedPid ?? 0 }),
        onDone: { target: 'stopped', actions: assign({ ownedPid: null }) },
        onError: {
          target: 'stopped',
          actions: {
            type: 'log',
            params: ({ event }) => ({
              line: `could not stop the Supervisor it started: ${String(event.error)}`,
            }),
          },
        },
      },
      after: {
        stopLimit: {
          target: 'stopped',
          actions: {
            type: 'log',
            params: ({ context }) => ({
              line: `the Supervisor (pid ${context.ownedPid}) did not stop in time`,
            }),
          },
        },
      },
      // Already stopping; a second quit waits for the same stop.
      on: { 'app.quit': { actions: [] } },
    },
    stopped: { type: 'final' },
  },
});
