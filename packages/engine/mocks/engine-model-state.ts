import { type Database, openDatabase } from '@repo/db';
import { afterAll, afterEach, beforeEach, vi } from 'vitest';
import { type Actor, type AnyEventObject, createActor } from 'xstate';
import type { CloseAcpResourcesInput } from '../src/engine/agent-cleanup';
import type { HttpServer, HttpServerOptions } from '../src/engine/http-server';
import type { EngineMessage } from '../src/engine/ipc';
import type { engineMachine as machine } from '../src/engine/machine';
import { type PendingCall, input } from './engine-model-fixtures';

export let openDatabaseCalls: PendingCall<{ home: string }, Database>[];

export let recoveryCalls: PendingCall<
  { database: Database; blobsFolder: string; home: string },
  void
>[];

export let startHttpServerCalls: PendingCall<HttpServerOptions, HttpServer>[];

export let closeHttpServerCalls: PendingCall<
  { server: HttpServer | null },
  void
>[];

export let closeResourceCalls: PendingCall<CloseAcpResourcesInput, void>[];

export let shutdownCommands: string[];

export let logs: string[];

export let processSignals: {
  send: (event: AnyEventObject) => void;
  live: boolean;
};

export let messages: EngineMessage[];

export let databaseCloses: number;

export let engine: Actor<typeof machine>;

const graphDatabase = openDatabase(':memory:');

afterAll((): void => graphDatabase.$client.close());

export let mockDatabase = graphDatabase;

let removeDatabase: () => void;

function prepareDatabase(): void {
  databaseCloses = 0;
  mockDatabase = openDatabase(':memory:');

  const close = vi
    .spyOn(mockDatabase.$client, 'close')
    .mockImplementation((): void => {
      databaseCloses += 1;
    });

  removeDatabase = (): void => {
    close.mockRestore();
    mockDatabase.$client.close();
  };
}

beforeEach((): void => {
  prepareDatabase();
  vi.useFakeTimers();
  openDatabaseCalls = [];
  recoveryCalls = [];
  startHttpServerCalls = [];
  closeHttpServerCalls = [];
  closeResourceCalls = [];
  shutdownCommands = [];
  logs = [];
  messages = [];
});

afterEach((): void => {
  engine.stop();
  removeDatabase();
  vi.useRealTimers();
});

export function startModelEngine(logic: typeof machine): void {
  engine = createActor(logic, { input }).start();
}

export function recordSignals(signals: typeof processSignals): void {
  processSignals = signals;
}
