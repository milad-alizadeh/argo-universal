import type { ServerAddress } from '@repo/contracts';
import {
  type ActorRef,
  assign,
  enqueueActions,
  fromPromise,
  type Snapshot,
  setup,
} from 'xstate';
import {
  readLiveServerAddress,
  startServer,
  stopServer,
} from './server-process';

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
export const serverMachine = setup({
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
    log: (_, params: { line: string }) => {
      console.error(`desktop: ${params.line}`);
    },
  },
  guards: {
    ownsSupervisor: ({ context }) => context.ownedPid !== null,
  },
  delays: { stopLimit: 5000 },
}).createMachine({
  id: 'server',
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
            guard: ({ event }) => event.output !== null,
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
              line: `could not stop the Server it started: ${String(event.error)}`,
            }),
          },
        },
      },
    },
    // The main process opens the window with this address.
    ready: {
      entry: enqueueActions(({ context, enqueue }) => {
        if (context.address)
          enqueue.emit({ type: 'server.ready', address: context.address });
      }),
    },
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
              line: `could not stop the Server it started: ${String(event.error)}`,
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
              line: `the Server (pid ${context.ownedPid}) did not stop in time`,
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
