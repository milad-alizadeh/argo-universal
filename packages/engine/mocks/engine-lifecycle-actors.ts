import { type Database } from '@repo/db';
import { fromCallback, type SnapshotFrom } from 'xstate';
import type { HttpServer, HttpServerOptions } from '../src/engine/http-server';
import { engineMachine } from '../src/engine/machine';
import {
  stopAllSessionsEvent,
  drainWriterEvent,
} from './engine-lifecycle-input';
import {
  createPromiseMock,
  record,
  type PendingCall,
} from './engine-lifecycle-record';
export const machineWithExternalMocks = engineMachine.provide({
  actors: {
    openDatabase: createPromiseMock(
      (): PendingCall<{ home: string }, Database>[] => record.openDatabaseCalls,
    ),
    recoverAfterRestart: createPromiseMock(
      (): PendingCall<
        { database: Database; blobsFolder: string; home: string },
        void
      >[] => record.recoveryCalls,
    ),
    startHttpServer: createPromiseMock(
      (): PendingCall<HttpServerOptions, HttpServer>[] =>
        record.startHttpServerCalls,
    ),
    closeHttpServer: createPromiseMock(
      (): PendingCall<{ server: HttpServer | null }, void>[] =>
        record.closeHttpServerCalls,
    ),
    processSignals: fromCallback(({ sendBack }): (() => void) => {
      const signals = { send: sendBack, live: true };
      record.processSignals = signals;
      return (): void => {
        signals.live = false;
      };
    }),
  },
  actions: {
    sendToSupervisor: (_, message): void => {
      record.messages.push(message);
    },
    log: (_, params): void => {
      record.logs.push(params.line);
    },
  },
});
export const machine = machineWithExternalMocks.provide({
  actors: {
    closeAcpResources: createPromiseMock(() => record.closeResourceCalls),
  },
  actions: {
    stopSessions: (): number =>
      record.shutdownCommands.push(stopAllSessionsEvent),
    drainWriter: (): number => record.shutdownCommands.push(drainWriterEvent),
  },
});
export type EngineSnapshot = SnapshotFrom<typeof machine>;
