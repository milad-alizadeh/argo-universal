import type { ServerAddress } from '@repo/contracts';
import { beforeEach } from 'vitest';
import {
  type EventObject,
  fromCallback,
  fromPromise,
  type PromiseActorLogic,
} from 'xstate';

// What the machine sent the Server Connection, such as a quit's release.
export const sentToCounts: string[] = [];

beforeEach((): void => {
  sentToCounts.length = 0;
});

// A Server Connection that holds on to what it is told until the test answers for it.
export const watchCountsDouble = fromCallback<
  EventObject,
  Pick<ServerAddress, 'port'>
>(({ receive }): void =>
  receive((event): void => void sentToCounts.push(event.type)),
);

export const supervisorExitedEvent = 'server.exited';

export const supervisorSpawnedEvent = 'server.spawned';

export const retryServerEvent = 'server.retry';

export const countsChangedEvent = 'counts.changed';

export const quitDoneEvent = 'xstate.done.actor.askQuit';

export const quitErrorEvent = 'xstate.error.actor.askQuit';

export const spawnedAt = Date.parse('2026-10-03T09:30:00.000Z');

export const runningAddress: ServerAddress = {
  pid: 100,
  port: 7337,
  version: '1.0.0',
  startedAt: '2026-10-03T09:00:00.000Z',
};

export const startedAddress: ServerAddress = {
  pid: 200,
  port: 7338,
  version: '1.0.0',
  startedAt: '2026-10-03T10:00:00.000Z',
};

// A server.json from before the spawn whose pid the OS gave to the new Supervisor.
export const staleAddress: ServerAddress = {
  ...startedAddress,
  port: 7339,
  startedAt: '2026-10-03T08:00:00.000Z',
};

export const exitReason = 'The Supervisor exited while starting (1)';

export const readError = new Error('EACCES');

export interface PendingCall<TInput, TOutput> {
  input: TInput;
  resolve: (output: TOutput) => void;
  reject: (error: Error) => void;
}

// A promise actor that records each call in `calls()` and settles only when an executor says so.
export const createPromiseMock = <TOutput, TInput>(
  calls: () => PendingCall<TInput, TOutput>[],
): PromiseActorLogic<TOutput, TInput, EventObject> =>
  fromPromise<TOutput, TInput>(
    ({ input }): Promise<TOutput> =>
      new Promise<TOutput>((resolve, reject): void => {
        calls().push({ input, resolve, reject });
      }),
  );
