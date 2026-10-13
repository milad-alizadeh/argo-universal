import { expect, vi } from 'vitest';
import { type EventExecutor } from 'xstate/graph';
import { type EngineEvent } from './engine-model-events';
import {
  stopAllSessionsEvent,
  drainWriterEvent,
  stopEngineEvent,
  heartbeatIntervalMs,
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

export const executors: Record<
  string,
  EventExecutor<EngineSnapshot, EngineEvent>
> = {
  'xstate.init': (): void => {
    startModelEngine(machine);
  },
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
  'xstate.after.httpCloseLimit.engine.live.stopping.closingHttp': (): void => {
    vi.advanceTimersByTime(5000);
  },
  'xstate.after.sessionStopLimit.engine.live.stopping.stoppingSessions':
    (): void => {
      vi.advanceTimersByTime(10000);
    },
  'xstate.after.writerDrainLimit.engine.live.stopping.drainingWriter':
    (): void => {
      vi.advanceTimersByTime(5000);
    },
  'xstate.after.heartbeatInterval.engine.live.running': (): void => {
    const sent = model.messages.length;
    vi.advanceTimersByTime(heartbeatIntervalMs - 1);
    expect(model.messages).toHaveLength(sent);
    vi.advanceTimersByTime(1);
    expect(model.messages).toHaveLength(sent + 1);
  },
  'engine.stop': (): void =>
    model.processSignals.send({ type: stopEngineEvent, reason: 'SIGTERM' }),
};
