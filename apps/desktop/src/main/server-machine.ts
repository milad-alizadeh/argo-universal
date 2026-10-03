import type { ServerAddress } from '@repo/contracts';
import {
  assign,
  type EventObject,
  enqueueActions,
  fromCallback,
  fromPromise,
  setup,
} from 'xstate';
import {
  isRunning,
  readLiveServerAddress,
  signalServer,
  spawnServer,
} from './server-process';

export interface ServerInput {
  home: string;
  // apps/server, which `spawnServer` runs.
  serverDirectory: string;
}

interface ServerContext extends ServerInput {
  address: ServerAddress | null;
  // The Supervisor this app started, which it stops on quit.
  ownedPid: number | null;
  failure: string | null;
}

type ServerEvent =
  | { type: 'server.spawned'; pid: number }
  | { type: 'server.exited'; reason: string }
  | { type: 'server.retry' }
  | { type: 'app.quit' };

export type ServerEmitted = { type: 'server.ready'; address: ServerAddress };

export interface CheckRunningInput {
  pid: number | null;
}

const pollDelayMs = 200;
const startLimitMs = 30_000;
const stopLimitMs = 5000;

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
    // Sends `server.spawned`, then `server.exited` if the Supervisor exits while it starts.
    spawnServer: fromCallback<EventObject, ServerInput>(({ input, sendBack }) =>
      spawnServer(input, {
        spawned: (pid) =>
          sendBack({ type: 'server.spawned', pid } satisfies ServerEvent),
        exited: (reason) =>
          sendBack({ type: 'server.exited', reason } satisfies ServerEvent),
      }),
    ),
    checkRunning: fromPromise<boolean, CheckRunningInput>(
      async ({ input }) => input.pid !== null && isRunning(input.pid),
    ),
  },
  actions: {
    // The main process opens the window with this address.
    announceReady: enqueueActions(({ context, enqueue }) => {
      if (context.address)
        enqueue.emit({ type: 'server.ready', address: context.address });
    }),
    signalSupervisor: ({ context }) => {
      if (context.ownedPid !== null) signalServer(context.ownedPid);
    },
    log: (_, params: { line: string }) => {
      console.error(`desktop: ${params.line}`);
    },
  },
  guards: {
    foundAddress: (_, params: { address: ServerAddress | null }) =>
      params.address !== null,
    namesOwnedPid: ({ context }, params: { address: ServerAddress | null }) =>
      params.address !== null && params.address.pid === context.ownedPid,
    stillRunning: (_, params: { running: boolean }) => params.running,
    ownsSupervisor: ({ context }) => context.ownedPid !== null,
  },
  delays: {
    pollDelay: pollDelayMs,
    startLimit: startLimitMs,
    stopLimit: stopLimitMs,
  },
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
    // Spawns the Supervisor, then reads server.json every `pollDelay` until it names that pid.
    starting: {
      invoke: {
        id: 'spawnServer',
        src: 'spawnServer',
        input: ({ context }) => ({
          home: context.home,
          serverDirectory: context.serverDirectory,
        }),
      },
      initial: 'spawning',
      on: {
        'server.spawned': {
          target: '.waiting',
          actions: assign({ ownedPid: ({ event }) => event.pid }),
        },
        'server.exited': [
          {
            guard: 'ownsSupervisor',
            target: 'abandoning',
            actions: assign({ failure: ({ event }) => event.reason }),
          },
          {
            target: 'failed',
            actions: assign({ failure: ({ event }) => event.reason }),
          },
        ],
      },
      after: {
        startLimit: [
          {
            guard: 'ownsSupervisor',
            target: 'abandoning',
            actions: assign({
              failure: ({ context }) =>
                `The Server (pid ${context.ownedPid}) did not answer in ${startLimitMs / 1000} seconds`,
            }),
          },
          {
            target: 'failed',
            actions: assign({
              failure: `The Server did not spawn in ${startLimitMs / 1000} seconds`,
            }),
          },
        ],
      },
      states: {
        spawning: {},
        waiting: { after: { pollDelay: 'checking' } },
        checking: {
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
                  type: 'namesOwnedPid',
                  params: ({ event }) => ({ address: event.output }),
                },
                target: '#serverConnection.ready',
                actions: assign({ address: ({ event }) => event.output }),
              },
              { target: 'waiting' },
            ],
            onError: {
              target: 'waiting',
              actions: {
                type: 'log',
                params: ({ event }) => ({
                  line: `could not read server.json: ${String(event.error)}`,
                }),
              },
            },
          },
        },
      },
    },
    // Stops the Supervisor that failed to start, so a Retry begins from nothing.
    abandoning: {
      entry: 'signalSupervisor',
      initial: 'waiting',
      after: {
        stopLimit: {
          target: 'failed',
          actions: {
            type: 'log',
            params: ({ context }) => ({
              line: `the Supervisor (pid ${context.ownedPid}) did not stop in ${stopLimitMs / 1000} seconds`,
            }),
          },
        },
      },
      states: {
        waiting: { after: { pollDelay: 'checking' } },
        checking: {
          invoke: {
            id: 'checkRunning',
            src: 'checkRunning',
            input: ({ context }) => ({ pid: context.ownedPid }),
            onDone: [
              {
                guard: {
                  type: 'stillRunning',
                  params: ({ event }) => ({ running: event.output }),
                },
                target: 'waiting',
              },
              {
                target: '#serverConnection.failed',
                actions: assign({ ownedPid: null }),
              },
            ],
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
      entry: 'signalSupervisor',
      initial: 'waiting',
      after: {
        stopLimit: {
          target: 'stopped',
          actions: {
            type: 'log',
            params: ({ context }) => ({
              line: `the Supervisor (pid ${context.ownedPid}) did not stop in ${stopLimitMs / 1000} seconds`,
            }),
          },
        },
      },
      // Already stopping; a second quit waits for the same stop.
      on: { 'app.quit': { actions: [] } },
      states: {
        waiting: { after: { pollDelay: 'checking' } },
        checking: {
          invoke: {
            id: 'checkRunning',
            src: 'checkRunning',
            input: ({ context }) => ({ pid: context.ownedPid }),
            onDone: [
              {
                guard: {
                  type: 'stillRunning',
                  params: ({ event }) => ({ running: event.output }),
                },
                target: 'waiting',
              },
              {
                target: '#serverConnection.stopped',
                actions: assign({ ownedPid: null }),
              },
            ],
          },
        },
      },
    },
    stopped: { type: 'final' },
  },
});
