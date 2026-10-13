import { type Database, openDatabase } from '@repo/db';
import { afterAll, vi, expect } from 'vitest';
import {
  createActor,
  fromPromise,
  type ActorRefFrom,
  type AnyEventObject,
  type EventObject,
  type PromiseActorLogic,
} from 'xstate';
import type { AcpResources } from '../src/acp';
import type { AgentInstallations } from '../src/agents';
import type { HttpServer, HttpServerOptions } from '../src/engine/http-server';
import type { EngineMessage } from '../src/engine/ipc';
import { engineMachine } from '../src/engine/machine';
import type { OpenSessionsActorRef } from '../src/sessions';
import { input } from './engine-lifecycle-input';
export interface PendingCall<TInput, TOutput> {
  input: TInput;
  resolve: (output: TOutput) => void;
  reject: (error: unknown) => void;
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

const graphDatabase = openDatabase(':memory:');
afterAll((): void => graphDatabase.$client.close());
export const record: {
  openDatabaseCalls: PendingCall<{ home: string }, Database>[];
  recoveryCalls: PendingCall<
    { database: Database; blobsFolder: string; home: string },
    void
  >[];
  startHttpServerCalls: PendingCall<HttpServerOptions, HttpServer>[];
  closeHttpServerCalls: PendingCall<{ server: HttpServer | null }, void>[];
  closeResourceCalls: PendingCall<
    {
      resources: AcpResources;
      installations: AgentInstallations;
      sessions: OpenSessionsActorRef | undefined;
    },
    void
  >[];
  shutdownCommands: string[];
  logs: string[];
  processSignals: { send: (event: AnyEventObject) => void; live: boolean };
  messages: EngineMessage[];
  databaseCloses: number;
  engine: ActorRefFrom<typeof engineMachine>;

  mockDatabase: Database;
  removeDatabase: () => void;
} = {
  openDatabaseCalls: [],
  recoveryCalls: [],
  startHttpServerCalls: [],
  closeHttpServerCalls: [],
  closeResourceCalls: [],
  shutdownCommands: [],
  logs: [],
  processSignals: { send: (): void => {}, live: false },
  messages: [],
  databaseCloses: 0,
  engine: createActor(engineMachine, { input }),
  mockDatabase: graphDatabase,
  removeDatabase: (): void => {},
};
// The closeHttpServer mock stands in for `close()`, so the handle itself is never called.
export const mockHttpServer: HttpServer = {
  createCaller: (): never =>
    expect.unreachable('Structural model does not call procedures'),
  close: (): never =>
    expect.unreachable('The machine closes through closeHttpServer'),
  closeSetup: async (): Promise<void> => {},
};

export function resetLifecycle(): void {
  record.mockDatabase = openDatabase(':memory:');
  const close = vi
    .spyOn(record.mockDatabase.$client, 'close')
    .mockImplementation((): void => {
      record.databaseCloses += 1;
    });
  record.removeDatabase = (): void => {
    close.mockRestore();
    record.mockDatabase.$client.close();
  };
}
export function resetCalls(): void {
  vi.useFakeTimers();
  record.openDatabaseCalls = [];
  record.recoveryCalls = [];
  record.startHttpServerCalls = [];
  record.closeHttpServerCalls = [];
  record.closeResourceCalls = [];
  record.shutdownCommands = [];
  record.logs = [];
  record.messages = [];
  record.databaseCloses = 0;
}
