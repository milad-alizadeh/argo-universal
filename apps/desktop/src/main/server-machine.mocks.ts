import type { ServerAddress } from '@repo/contracts';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import {
  type Actor,
  type AnyEventObject,
  createActor,
  fromCallback,
  fromPromise,
  type SnapshotFrom,
  type PromiseActorLogic,
  type EventObject,
} from 'xstate';
import {
  type CheckRunningInput,
  type ServerInput,
  type SpawnInput,
  serverConnectionMachine,
} from './server-machine';
import {
  exitReason,
  spawnedAt,
  startedAddress,
  supervisorExitedEvent,
  supervisorSpawnedEvent,
  watchCountsDouble,
} from './server-machine-data.mocks';

export {
  countsChangedEvent,
  exitReason,
  quitDoneEvent,
  quitErrorEvent,
  retryServerEvent,
  runningAddress,
  spawnedAt,
  staleAddress,
  startedAddress,
  supervisorExitedEvent,
  supervisorSpawnedEvent,
  watchCountsDouble,
} from './server-machine-data.mocks';

export interface PendingCall<TInput, TOutput> {
  input: TInput;
  resolve: (output: TOutput) => void;
  reject: (error: Error) => void;
}

export interface SpawnCall {
  input: SpawnInput;
  live: boolean;
}

// A promise actor that records each call in `calls()` and settles only when an executor says so.
const createPromiseMock = <TOutput, TInput>(
  calls: () => PendingCall<TInput, TOutput>[],
): PromiseActorLogic<TOutput, TInput, EventObject> =>
  fromPromise<TOutput, TInput>(
    ({ input }): Promise<TOutput> =>
      new Promise<TOutput>((resolve, reject): void => {
        calls().push({ input, resolve, reject });
      }),
  );

export let readAddressCalls: PendingCall<ServerInput, ServerAddress | null>[];

export let checkRunningCalls: PendingCall<CheckRunningInput, boolean>[];

export let spawnCalls: SpawnCall[];

export let quitCalls: PendingCall<
  { running: number; ask: ServerInput['askToKeepSessions'] },
  boolean
>[];

export let badges: number[];

export let stoppedPids: (number | null)[];

export let readyAddresses: ServerAddress[];

export let failures: (string | null)[];

export let server: Actor<typeof machine>;

export const machine = serverConnectionMachine.provide({
  actors: {
    watchCounts: watchCountsDouble,
    askQuit: createPromiseMock(() => quitCalls),
    readAddress: createPromiseMock(
      (): PendingCall<ServerInput, ServerAddress | null>[] => readAddressCalls,
    ),
    checkRunning: createPromiseMock(
      (): PendingCall<CheckRunningInput, boolean>[] => checkRunningCalls,
    ),
    spawnSupervisor: fromCallback<AnyEventObject, SpawnInput>(
      ({ input }): (() => void) => {
        const call = { input, live: true };
        spawnCalls.push(call);

        return (): void => {
          call.live = false;
        };
      },
    ),
  },
  actions: {
    stopOwnedSupervisor: ({ context }): void => {
      stoppedPids.push(context.ownedPid);
    },
    log: (): void => {},
  },
});

export type ServerSnapshot = SnapshotFrom<typeof machine>;

export const input: ServerInput = {
  home: '/unused',
  cliDirectory: '/unused',
  askToKeepSessions: async () => false,
};

export const startServerMachine = (): typeof server => {
  server = createActor(machine, { input });
  server.on('server.ready', ({ address }): void => {
    readyAddresses.push(address);
  });
  server.on('server.failed', ({ failure }): void => {
    failures.push(failure);
  });
  server.on('badge.changed', ({ attention }): void => {
    badges.push(attention);
  });
  server.start();

  return server;
};

export const latest = <TCall>(calls: TCall[]): NonNullable<TCall> =>
  calls.at(-1) ?? expect.unreachable('The actor was not invoked');

// What the real `spawnSupervisor` sends to the machine it was given.
export const reportSpawned = (): void =>
  latest(spawnCalls).input.parent.send({
    type: supervisorSpawnedEvent,
    pid: startedAddress.pid,
    at: spawnedAt,
  });

export const reportExited = (): void =>
  latest(spawnCalls).input.parent.send({
    type: supervisorExitedEvent,
    reason: exitReason,
  });

// Settles a mock promise, then lets the machine take its done or error event.
export const settle = async (settleCall: () => void): Promise<void> => {
  settleCall();
  await vi.advanceTimersByTimeAsync(0);
};

beforeEach((): void => {
  vi.useFakeTimers();
  readAddressCalls = [];
  checkRunningCalls = [];
  spawnCalls = [];
  quitCalls = [];
  badges = [];
  stoppedPids = [];
  readyAddresses = [];
  failures = [];
});

afterEach((): void => {
  server?.stop();
  vi.useRealTimers();
});
