type ServerStateConfig = ReturnType<typeof serverSetup.createStateConfig>;
type ReadingAddressState = Required<Pick<ServerStateConfig, 'invoke'>>;
type WaitingForSupervisorExitState = Required<
  Pick<ServerStateConfig, 'entry' | 'initial' | 'after'>
> & {
  states: Record<
    'waiting' | 'checking',
    Pick<ServerStateConfig, 'after' | 'invoke'>
  >;
};
type RunningParameters = { running: boolean };
type ServerLogParameters = { line: string };
type AddressParameters = { address: ServerAddress | null };
import type { ServerAddress } from '@repo/contracts';
import {
  type ActorRef,
  assign,
  type EventObject,
  enqueueActions,
  fromCallback,
  fromPromise,
  type Snapshot,
  setup,
} from 'xstate';
import {
  isRunning,
  readLiveServerAddress,
  type SupervisorPaths,
  signalSupervisor,
  spawnSupervisor,
} from './server-process';

export type ServerInput = SupervisorPaths;

interface ServerContext extends ServerInput {
  address: ServerAddress | null;
  // The Supervisor this app started, which it stops on quit.
  ownedPid: number | null;
  // When this app spawned `ownedPid`, so a stale server.json that names a reused pid does not count.
  spawnedAt: number | null;
  failure: string | null;
}

type SupervisorReport =
  | { type: 'server.spawned'; pid: number; at: number }
  | { type: 'server.exited'; reason: string };
type ServerEvent =
  | SupervisorReport
  | { type: 'server.retry' }
  | { type: 'app.quit' };

export type ServerEmitted =
  | { type: 'server.ready'; address: ServerAddress }
  | { type: 'server.failed'; failure: string | null };

export interface SpawnInput extends ServerInput {
  parent: ActorRef<Snapshot<unknown>, SupervisorReport>;
}

export interface CheckRunningInput {
  pid: number;
}

const pollDelayMs = 200;
const startLimitMs = 30_000;
const stopLimitMs = 5000;
const millisecondsPerSecond = 1000;

const serverInput = ({ context }: { context: ServerContext }): ServerInput => ({
  home: context.home,
  serverDirectory: context.serverDirectory,
});

// Only states that the `ownsSupervisor` guard leads to call this.
const requireOwnedPid = (context: ServerContext): number => {
  if (context.ownedPid === null) throw new Error('This app owns no Supervisor');
  return context.ownedPid;
};

const serverSetup = setup({
  types: {
    input: {} as ServerInput,
    context: {} as ServerContext,
    events: {} as ServerEvent,
    emitted: {} as ServerEmitted,
  },
  actors: {
    // The Supervisor in server.json, if its pid is alive; of any version until release packaging checks it.
    readAddress: fromPromise<ServerAddress | null, ServerInput>(
      ({ input }): Promise<ServerAddress | null> =>
        readLiveServerAddress(input.home),
    ),
    // Sends `server.spawned`, then `server.exited` if the Supervisor exits while it starts.
    spawnSupervisor: fromCallback<EventObject, SpawnInput>(
      ({ input }): (() => void) =>
        spawnSupervisor(input, {
          spawned: (pid): void =>
            input.parent.send({ type: 'server.spawned', pid, at: Date.now() }),
          exited: (reason): void =>
            input.parent.send({ type: 'server.exited', reason }),
        }),
    ),
    checkRunning: fromPromise<boolean, CheckRunningInput>(
      async ({ input }): Promise<boolean> => isRunning(input.pid),
    ),
  },
  actions: {
    // The main process opens the window with this address.
    announceReady: enqueueActions(({ context, enqueue }): void => {
      if (context.address)
        enqueue.emit({ type: 'server.ready', address: context.address });
    }),
    announceFailure: enqueueActions(({ context, enqueue }): void => {
      enqueue.emit({ type: 'server.failed', failure: context.failure });
    }),
    signalOwnedSupervisor: ({ context }): void => {
      signalSupervisor(requireOwnedPid(context));
    },
    forgetSupervisor: assign({ ownedPid: null, spawnedAt: null }),
    log: (_, params: ServerLogParameters): void => {
      console.error(`desktop: ${params.line}`);
    },
  },
  guards: {
    foundAddress: (_, params: AddressParameters): boolean =>
      params.address !== null,
    namesOwnedSupervisor: ({ context }, params: AddressParameters): boolean =>
      params.address !== null &&
      params.address.pid === context.ownedPid &&
      context.spawnedAt !== null &&
      Date.parse(params.address.startedAt) >= context.spawnedAt,
    stillRunning: (_, params: RunningParameters): boolean => params.running,
    ownsSupervisor: ({ context }): boolean => context.ownedPid !== null,
  },
  delays: {
    pollDelay: pollDelayMs,
    startLimit: startLimitMs,
    stopLimit: stopLimitMs,
  },
});

// Reads server.json once: `ready` with a live Supervisor, otherwise `noneTarget`.
const readingAddress = (noneTarget: string): ReadingAddressState =>
  serverSetup.createStateConfig({
    invoke: {
      id: 'readAddress',
      src: 'readAddress',
      input: serverInput,
      onDone: [
        {
          guard: {
            type: 'foundAddress',
            params: ({ event }): AddressParameters => ({
              address: event.output,
            }),
          },
          target: '#serverConnection.ready',
          actions: assign({
            address: ({ event }): ServerContext['address'] => event.output,
            failure: null,
          }),
        },
        { target: noneTarget },
      ],
      onError: {
        target: '#serverConnection.failed',
        actions: assign({
          failure: ({ event }): string =>
            `could not read server.json: ${String(event.error)}`,
        }),
      },
    },
  });

// Signals the Supervisor this app owns, then checks every `pollDelay` until it exits, for `stopLimit` at most.
const waitingForSupervisorExit = (
  exitedTarget: string,
  stuckTarget = exitedTarget,
): WaitingForSupervisorExitState =>
  serverSetup.createStateConfig({
    entry: 'signalOwnedSupervisor',
    initial: 'waiting',
    after: {
      stopLimit: {
        target: stuckTarget,
        actions: {
          type: 'log',
          params: ({ context }): ServerLogParameters => ({
            line: `the Supervisor (pid ${context.ownedPid}) did not stop in ${stopLimitMs / millisecondsPerSecond} seconds`,
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
          input: ({ context }): CheckRunningInput => ({
            pid: requireOwnedPid(context),
          }),
          onDone: [
            {
              guard: {
                type: 'stillRunning',
                params: ({ event }): RunningParameters => ({
                  running: event.output,
                }),
              },
              target: 'waiting',
            },
            { target: exitedTarget, actions: 'forgetSupervisor' },
          ],
        },
      },
    },
  });

// Electron makes sure a Supervisor runs, and on quit stops only one that it started.
export const serverConnectionMachine = serverSetup.createMachine({
  id: 'serverConnection',
  context: ({ input }): ServerContext => ({
    ...input,
    address: null,
    ownedPid: null,
    spawnedAt: null,
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
      entry: assign({ failure: null }),
      ...readingAddress('#serverConnection.starting'),
    },
    starting: {
      invoke: {
        id: 'spawnSupervisor',
        src: 'spawnSupervisor',
        input: ({ context, self }): SpawnInput => ({
          ...serverInput({ context }),
          parent: self,
        }),
      },
      initial: 'spawning',
      on: {
        'server.spawned': {
          target: '.answering',
          actions: assign({
            ownedPid: ({ event }): number => event.pid,
            spawnedAt: ({ event }): number => event.at,
          }),
        },
        'server.exited': {
          target: 'rechecking',
          actions: [
            'forgetSupervisor',
            assign({ failure: ({ event }): string => event.reason }),
          ],
        },
      },
      states: {
        spawning: {},
        // Reads server.json every `pollDelay` until it names the spawned Supervisor.
        answering: {
          initial: 'waiting',
          after: {
            startLimit: {
              target: '#serverConnection.abandoning',
              actions: assign({
                failure: ({ context }): string =>
                  `The Supervisor (pid ${context.ownedPid}) did not answer in ${startLimitMs / millisecondsPerSecond} seconds`,
              }),
            },
          },
          states: {
            waiting: { after: { pollDelay: 'checking' } },
            checking: {
              invoke: {
                id: 'readAddress',
                src: 'readAddress',
                input: serverInput,
                onDone: [
                  {
                    guard: {
                      type: 'namesOwnedSupervisor',
                      params: ({ event }): AddressParameters => ({
                        address: event.output,
                      }),
                    },
                    target: '#serverConnection.ready',
                    actions: assign({
                      address: ({ event }): ServerAddress | null =>
                        event.output,
                    }),
                  },
                  { target: 'waiting' },
                ],
                onError: {
                  target: 'waiting',
                  actions: {
                    type: 'log',
                    params: ({ event }): ServerLogParameters => ({
                      line: `could not read server.json: ${String(event.error)}`,
                    }),
                  },
                },
              },
            },
          },
        },
      },
    },
    // Its Supervisor exited while starting; another one may have won the race to start.
    rechecking: readingAddress('#serverConnection.failed'),
    // Stops the Supervisor that did not answer, so a Retry begins from nothing.
    abandoning: waitingForSupervisorExit('#serverConnection.failed'),
    ready: { entry: 'announceReady' },
    failed: {
      entry: 'announceFailure',
      on: {
        'server.retry': [
          { guard: 'ownsSupervisor', target: 'retrying' },
          { target: 'locating' },
        ],
      },
    },
    // The last attempt's Supervisor has not stopped yet; Retry stops it before it starts over.
    retrying: waitingForSupervisorExit(
      '#serverConnection.locating',
      '#serverConnection.failed',
    ),
    stopping: {
      ...waitingForSupervisorExit('#serverConnection.stopped'),
      // Already stopping; a second quit waits for the same stop.
      on: { 'app.quit': { actions: [] } },
    },
    stopped: { type: 'final' },
  },
});
