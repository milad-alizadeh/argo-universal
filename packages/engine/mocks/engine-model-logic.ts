import { type Database } from '@repo/db';
import { fromCallback, type SnapshotFrom } from 'xstate';
import type { HttpServer, HttpServerOptions } from '../src/engine/http-server';
import { engineMachine } from '../src/engine/machine';
import {
  stopAllSessionsEvent,
  drainWriterEvent,
  type PendingCall,
  createPromiseMock,
} from './engine-model-fixtures';
import * as model from './engine-model-state';

export const machineWithExternalMocks = engineMachine.provide({
  actors: {
    openDatabase: createPromiseMock(
      (): PendingCall<{ home: string }, Database>[] => model.openDatabaseCalls,
    ),
    recoverAfterRestart: createPromiseMock(
      (): PendingCall<
        { database: Database; blobsFolder: string; home: string },
        void
      >[] => model.recoveryCalls,
    ),
    startHttpServer: createPromiseMock(
      (): PendingCall<HttpServerOptions, HttpServer>[] =>
        model.startHttpServerCalls,
    ),
    closeHttpServer: createPromiseMock(
      (): PendingCall<{ server: HttpServer | null }, void>[] =>
        model.closeHttpServerCalls,
    ),
    processSignals: fromCallback(({ sendBack }): (() => void) => {
      const signals = { send: sendBack, live: true };
      model.recordSignals(signals);

      return (): void => {
        signals.live = false;
      };
    }),
  },
  actions: {
    sendToSupervisor: (_, message): void => {
      model.messages.push(message);
    },
    log: (_, params): void => {
      model.logs.push(params.line);
    },
  },
});

export const machine = machineWithExternalMocks.provide({
  actors: {
    closeAcpResources: createPromiseMock(() => model.closeResourceCalls),
  },
  actions: {
    stopSessions: (): number =>
      model.shutdownCommands.push(stopAllSessionsEvent),
    drainWriter: (): number => model.shutdownCommands.push(drainWriterEvent),
  },
});

export type EngineSnapshot = SnapshotFrom<typeof machine>;
