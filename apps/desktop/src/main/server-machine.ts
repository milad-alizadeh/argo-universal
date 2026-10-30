import { supervisorStopGraceMs } from '@repo/cli/supervisor-command';
import type { ServerAddress } from '@repo/contracts';
import {
  isAlive,
  millisecondsPerSecond,
  pollIntervalMs,
  startLimitMs,
  stopLimitMs,
  stopProcess,
} from '@repo/process';
import {
  type ActorRef,
  assign,
  type EventObject,
  enqueueActions,
  fromCallback,
  fromPromise,
  sendTo,
  type Snapshot,
  setup,
} from 'xstate';
import {
  readLiveServerAddress,
  type SupervisorPaths,
  spawnSupervisor,
} from './server-process';
import {
  type CountsReport,
  countsReleaseEvent,
  releaseLimitMs,
  watchSessionCounts,
} from './session-counts';

const failedConnectionTarget = '#serverConnection.failed';

const countsActorId = 'watchCounts';

const stoppedTarget = '#serverConnection.stopped';

const stoppingTarget = '#serverConnection.stopping';

// Where a quit goes once the App has let go of its Server Connection.
const quitAfterRelease = [
  { guard: 'ownsRunningSessions', target: 'confirming' },
  { guard: 'ownsSupervisor', target: stoppingTarget },
  { target: stoppedTarget },
] as const;

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

export interface ServerInput extends SupervisorPaths {
  askToKeepSessions: (running: number) => Promise<boolean>;
}

interface ServerContext extends ServerInput {
  address: ServerAddress | null;
  // The Supervisor this app started, which it stops on quit.
  ownedPid: number | null;
  // When this app spawned `ownedPid`, so a stale server.json that names a reused pid does not count.
  spawnedAt: number | null;
  failure: string | null;
  running: number;
}

type SupervisorReport =
  | { type: 'server.spawned'; pid: number; at: number }
  | { type: 'server.exited'; reason: string };

type ServerEvent =
  | SupervisorReport
  | CountsReport
  | { type: 'server.retry' }
  | { type: 'app.quit' };

type ServerEmitted =
  | { type: 'badge.changed'; attention: number }
  | { type: 'server.ready'; address: ServerAddress }
  | { type: 'server.failed'; failure: string | null };

export interface SpawnInput extends ServerInput {
  parent: ActorRef<Snapshot<unknown>, SupervisorReport>;
}

export interface CheckRunningInput {
  pid: number;
}

const serverInput = ({ context }: { context: ServerContext }): ServerInput => ({
  home: context.home,
  cliDirectory: context.cliDirectory,
  askToKeepSessions: context.askToKeepSessions,
});

// Only states that the `ownsSupervisor` guard leads to call this.
const requireOwnedPid = (context: ServerContext): number => {
  if (context.ownedPid === null) throw new Error('This app owns no Supervisor');

  return context.ownedPid;
};

function addressMatchesOwner(
  context: ServerContext,
  address: ServerAddress,
): boolean {
  return (
    address.pid === context.ownedPid && startedAfterSpawn(context, address)
  );
}

function startedAfterSpawn(
  context: ServerContext,
  address: ServerAddress,
): boolean {
  return (
    context.spawnedAt !== null &&
    Date.parse(address.startedAt) >= context.spawnedAt
  );
}

const serverSetup = setup({
  // SAFETY: XState v5 reads these empty objects only for their types and never at runtime (ADR-0016).
  types: {
    input: {} as ServerInput,
    context: {} as ServerContext,
    events: {} as ServerEvent,
    emitted: {} as ServerEmitted,
  },
  actors: {
    watchCounts: watchSessionCounts,
    askQuit: fromPromise<
      boolean,
      { running: number; ask: ServerInput['askToKeepSessions'] }
    >(({ input }): Promise<boolean> => input.ask(input.running)),
    // The Supervisor in server.json, if its pid is alive; of any version until release packaging checks it.
    readAddress: fromPromise<ServerAddress | null, ServerInput>(
      async ({ input }): Promise<ServerAddress | null> =>
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
      async ({ input }): Promise<boolean> => isAlive(input.pid),
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
    // The ladder runs on past `stopLimit`, so a Supervisor that never stops has its group killed once its grace passes.
    stopOwnedSupervisor: ({ context }): void => {
      void stopProcess(requireOwnedPid(context), supervisorStopGraceMs);
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
      params.address !== null && addressMatchesOwner(context, params.address),
    stillRunning: (_, params: RunningParameters): boolean => params.running,
    ownsSupervisor: ({ context }): boolean => context.ownedPid !== null,
    ownsRunningSessions: ({ context }): boolean =>
      context.ownedPid !== null && context.running > 0,
  },
  delays: {
    pollDelay: pollIntervalMs,
    startLimit: startLimitMs,
    stopLimit: stopLimitMs,
    releaseLimit: releaseLimitMs,
  },
});

const readAddressTemplate = serverSetup.createStateConfig({
  invoke: {
    id: 'readAddress',
    src: 'readAddress',
    input: serverInput,
    onDone: [
      {
        guard: {
          type: 'foundAddress',
          params: ({ event }): AddressParameters => ({ address: event.output }),
        },
        target: '#serverConnection.ready',
        actions: assign({
          address: ({ event }): ServerContext['address'] => event.output,
          failure: null,
        }),
      },
    ],
    onError: {
      target: failedConnectionTarget,
      actions: assign({
        failure: ({ event }): string =>
          `could not read server.json: ${String(event.error)}`,
      }),
    },
  },
});

// Reads server.json once: `ready` with a live Supervisor, otherwise `noneTarget`.
const readingAddress = (noneTarget: string): ReadingAddressState =>
  serverSetup.createStateConfig({
    invoke: {
      ...readAddressTemplate.invoke,
      onDone: [...readAddressTemplate.invoke.onDone, { target: noneTarget }],
    },
  });

const checkingTemplate = serverSetup.createStateConfig({
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
          params: ({ event }): RunningParameters => ({ running: event.output }),
        },
        target: 'waiting',
      },
    ],
  },
});

function checkingState(
  exitedTarget: string,
): Required<Pick<ServerStateConfig, 'invoke'>> {
  return serverSetup.createStateConfig({
    invoke: {
      ...checkingTemplate.invoke,
      onDone: [
        ...checkingTemplate.invoke.onDone,
        { target: exitedTarget, actions: 'forgetSupervisor' },
      ],
    },
  });
}

const stopTimeoutTemplate = serverSetup.createStateConfig({
  after: {
    stopLimit: {
      actions: {
        type: 'log',
        params: ({ context }): ServerLogParameters => ({
          line: `the Supervisor (pid ${context.ownedPid}) did not stop in ${stopLimitMs / millisecondsPerSecond} seconds`,
        }),
      },
    },
  },
});

function stopTimeout(
  stuckTarget: string,
): Required<Pick<ServerStateConfig, 'after'>> {
  return serverSetup.createStateConfig({
    after: {
      stopLimit: {
        ...stopTimeoutTemplate.after.stopLimit,
        target: stuckTarget,
      },
    },
  });
}

// Stops the Supervisor this app owns, then checks every `pollDelay` until it exits, for `stopLimit` at most.
const waitingForSupervisorExit = (
  exitedTarget: string,
  stuckTarget = exitedTarget,
): WaitingForSupervisorExitState =>
  serverSetup.createStateConfig({
    entry: 'stopOwnedSupervisor',
    initial: 'waiting',
    ...stopTimeout(stuckTarget),
    states: {
      waiting: { after: { pollDelay: 'checking' } },
      checking: checkingState(exitedTarget),
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
    running: 0,
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
            spawnedAt: ({ context, event }): number =>
              context.spawnedAt ?? event.at,
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
    rechecking: readingAddress(failedConnectionTarget),
    // Stops the Supervisor that did not answer, so a Retry begins from nothing.
    abandoning: waitingForSupervisorExit(failedConnectionTarget),
    ready: {
      entry: 'announceReady',
      invoke: {
        id: countsActorId,
        src: 'watchCounts',
        input: ({ context }): Pick<ServerAddress, 'port'> => {
          if (!context.address) throw new Error('The Server has no address');

          return { port: context.address.port };
        },
      },
      initial: 'active',
      on: {
        // Try again in the App when the Server has gone: make sure a Supervisor runs again, exactly as at launch. One still listening is reused, never replaced.
        'server.retry': { target: 'locating' },
        'counts.changed': {
          actions: [
            assign({ running: ({ event }): number => event.counts.running }),
            enqueueActions(({ event, enqueue }): void => {
              enqueue.emit({
                type: 'badge.changed',
                attention: event.counts.attention,
              });
            }),
          ],
        },
        'counts.disconnected': {
          actions: [
            assign({ running: 0 }),
            enqueueActions(({ enqueue }): void => {
              enqueue.emit({ type: 'badge.changed', attention: 0 });
            }),
          ],
        },
      },
      states: {
        active: {
          on: { 'app.quit': { target: 'releasing' } },
        },
        // Lets go of the Server Connection first; `watchSessionCounts` says why that has to happen before the App quits.
        releasing: {
          entry: sendTo(countsActorId, { type: countsReleaseEvent }),
          on: {
            'counts.released': quitAfterRelease,
            // The App is on its way out, so a disconnect no longer clears the badge or the Session count the question needs.
            'counts.disconnected': { actions: [] },
            // Already letting go; a second quit waits for the same release.
            'app.quit': { actions: [] },
          },
          // A Server that never answers may not hold the App open.
          after: { releaseLimit: quitAfterRelease },
        },
        confirming: {
          invoke: {
            id: 'askQuit',
            src: 'askQuit',
            input: ({ context }) => ({
              running: context.running,
              ask: context.askToKeepSessions,
            }),
            onDone: [
              {
                guard: ({ event }): boolean => event.output,
                target: stoppedTarget,
              },
              { target: stoppingTarget },
            ],
            // The App stays, but its Server Connection was let go, so it is built again.
            onError: { target: '#serverConnection.locating' },
          },
          on: { 'app.quit': { actions: [] } },
        },
      },
    },
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
      failedConnectionTarget,
    ),
    stopping: {
      ...waitingForSupervisorExit(stoppedTarget),
      // Already stopping; a second quit waits for the same stop.
      on: { 'app.quit': { actions: [] } },
    },
    stopped: { type: 'final' },
  },
});
