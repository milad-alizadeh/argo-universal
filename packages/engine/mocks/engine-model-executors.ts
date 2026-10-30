import type { DelayEvent } from '@repo/vitest/model-test';
import { expect, vi } from 'vitest';
import { type Actor } from 'xstate';
import { type EventExecutor } from 'xstate/graph';
import { type EngineEvent } from './engine-model-events';
import {
  stopAllSessionsEvent,
  drainWriterEvent,
  stopEngineEvent,
  mockHttpServer,
  openError,
  recoveryError,
  listenError,
  closeError,
  sessionFailure,
  writerFailure,
} from './engine-model-fixtures';
import { machine, type EngineSnapshot } from './engine-model-logic';
import * as model from './engine-model-state';
import { startModelEngine } from './engine-model-state';

export const latest = <TCall>(calls: TCall[]): NonNullable<TCall> =>
  calls.at(-1) ?? expect.unreachable('The actor was not invoked');

// Settles a mock promise, then lets the machine take its done or error event.
export const settle = async (settleCall: () => void): Promise<void> => {
  settleCall();
  await vi.advanceTimersByTimeAsync(0);
};

export const startEngine = (): Actor<typeof machine> => {
  startModelEngine(machine);

  return model.engine;
};

export const executors: Record<
  EngineEvent['type'],
  EventExecutor<EngineSnapshot, EngineEvent | DelayEvent>
> = {
  'xstate.done.actor.openDatabase': (): Promise<void> =>
    settle((): void =>
      latest(model.openDatabaseCalls).resolve(model.mockDatabase),
    ),
  'xstate.error.actor.openDatabase': (): Promise<void> =>
    settle((): void => latest(model.openDatabaseCalls).reject(openError)),
  'xstate.done.actor.recoverAfterRestart': (): Promise<void> =>
    settle((): void => latest(model.recoveryCalls).resolve()),
  'xstate.error.actor.recoverAfterRestart': (): Promise<void> =>
    settle((): void => latest(model.recoveryCalls).reject(recoveryError)),
  'xstate.done.actor.startHttpServer': (): Promise<void> =>
    settle((): void =>
      latest(model.startHttpServerCalls).resolve(mockHttpServer),
    ),
  'xstate.error.actor.startHttpServer': (): Promise<void> =>
    settle((): void => latest(model.startHttpServerCalls).reject(listenError)),
  'xstate.done.actor.closeHttpServer': (): Promise<void> =>
    settle((): void => latest(model.closeHttpServerCalls).resolve()),
  'xstate.error.actor.closeHttpServer': (): Promise<void> =>
    settle((): void => latest(model.closeHttpServerCalls).reject(closeError)),
  'xstate.done.actor.sessions': (): void =>
    model.engine.system.get('sessions').send({ type: stopAllSessionsEvent }),
  'xstate.error.actor.sessions': (): void => model.engine.send(sessionFailure),
  'xstate.done.actor.closeAcpResources': (): Promise<void> =>
    settle(() => latest(model.closeResourceCalls).resolve()),
  'xstate.error.actor.closeAcpResources': ({ event }): Promise<void> =>
    settle(() => {
      if ('error' in event)
        latest(model.closeResourceCalls).reject(event.error);
    }),
  'xstate.done.actor.databaseWriter': (): void =>
    model.engine.system.get('databaseWriter').send({ type: drainWriterEvent }),
  'xstate.error.actor.databaseWriter': (): void =>
    model.engine.send(writerFailure),
  'engine.stop': (): void =>
    model.processSignals.send({ type: stopEngineEvent, reason: 'SIGTERM' }),
};
