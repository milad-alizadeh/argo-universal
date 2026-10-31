import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import {
  type EventFromLogic,
  type ErrorActorEvent,
  fromPromise,
  type PromiseActorLogic,
  type EventObject,
} from 'xstate';
import type { HttpServer } from '../src/engine/http-server';
import type { engineMachine as machine } from '../src/engine/machine';

export const stopAllSessionsEvent = 'sessions.stopAll';

export const drainWriterEvent = 'writer.drain';

export const stopEngineEvent = 'engine.stop';

// The Engine sends a heartbeat every second.
export const heartbeatIntervalMs = 1000;

export interface PendingCall<TInput, TOutput> {
  input: TInput;
  resolve: (output: TOutput) => void;
  reject: (cause: unknown) => void;
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

// The closeHttpServer mock stands in for `close()`, so the handle itself is never called.
export const mockHttpServer: HttpServer = {
  get notifications(): never {
    return expect.unreachable(
      'Structural model does not deliver notifications',
    );
  },
  get localNetworkAccess(): never {
    return expect.unreachable('Structural model does not change the bind');
  },
  get pairing(): never {
    return expect.unreachable('Structural model mints no Pairing Ticket');
  },
  listeningOn: (): string => '127.0.0.1:7337',
  createCaller: (): never =>
    expect.unreachable('Structural model does not call procedures'),
  close: (): never =>
    expect.unreachable('The machine closes through closeHttpServer'),
};

Object.defineProperty(mockHttpServer, 'notifications', { enumerable: false });

Object.defineProperty(mockHttpServer, 'pairing', { enumerable: false });

Object.defineProperty(mockHttpServer, 'localNetworkAccess', {
  enumerable: false,
});

export const input = {
  now: (): number => Date.now(),
  createId: randomUUID,
  home: '/unused',
  cliEntry: '/unused/argo.mjs',
  port: 7337,
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  // No Agents, so the open Sessions machine never probes a real CLI.
  fixtureAgents: [],
};

export const openError = new Error('database is locked');

export const recoveryError = new Error('repair failed');

export const listenError = Object.assign(new Error('listen EADDRINUSE'), {
  code: 'EADDRINUSE',
});

export const closeError = new Error('close failed');

// Done and error events of invoked actors are not in the machine's event type, but the model drives them.
export const sessionFailure = {
  type: 'xstate.error.actor.sessions',
  actorId: 'sessions',
  error: new Error('stop failed'),
} satisfies EventFromLogic<typeof machine> & ErrorActorEvent<Error, 'sessions'>;

export const writerFailure = {
  type: 'xstate.error.actor.databaseWriter',
  actorId: 'databaseWriter',
  error: new Error('drain failed'),
} satisfies EventFromLogic<typeof machine> &
  ErrorActorEvent<Error, 'databaseWriter'>;
