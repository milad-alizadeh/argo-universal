import { vi, expect } from 'vitest';
import { createActor } from 'xstate';
import type { EventExecutor } from 'xstate/graph';
import { machine, type EngineSnapshot } from './engine-lifecycle-actors';
import {
  type EngineEvent,
  openError,
  recoveryError,
  listenError,
  closeError,
  sessionFailure,
  writerFailure,
} from './engine-lifecycle-fixtures';
import {
  input,
  stopEngineEvent,
  stopAllSessionsEvent,
  drainWriterEvent,
  heartbeatIntervalMs,
} from './engine-lifecycle-input';
import { record, mockHttpServer } from './engine-lifecycle-record';
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
    record.engine = createActor(machine, { input }).start();
  },
  'xstate.done.actor.openDatabase': (): Promise<void> =>
    settle((): void =>
      latest(record.openDatabaseCalls).resolve(record.mockDatabase),
    ),
  'xstate.error.actor.openDatabase': (): Promise<void> =>
    settle((): void => latest(record.openDatabaseCalls).reject(openError)),
  'xstate.done.actor.recoverAfterRestart': (): Promise<void> =>
    settle((): void => latest(record.recoveryCalls).resolve()),
  'xstate.error.actor.recoverAfterRestart': (): Promise<void> =>
    settle((): void => latest(record.recoveryCalls).reject(recoveryError)),
  'xstate.done.actor.startHttpServer': (): Promise<void> =>
    settle((): void =>
      latest(record.startHttpServerCalls).resolve(mockHttpServer),
    ),
  'xstate.error.actor.startHttpServer': (): Promise<void> =>
    settle((): void => latest(record.startHttpServerCalls).reject(listenError)),
  'xstate.done.actor.closeHttpServer': (): Promise<void> =>
    settle((): void => latest(record.closeHttpServerCalls).resolve()),
  'xstate.error.actor.closeHttpServer': (): Promise<void> =>
    settle((): void => latest(record.closeHttpServerCalls).reject(closeError)),
  'xstate.done.actor.sessions': (): void =>
    record.engine.system.get('sessions').send({ type: stopAllSessionsEvent }),
  'xstate.error.actor.sessions': (): void => record.engine.send(sessionFailure),
  'xstate.done.actor.closeAcpResources': (): Promise<void> =>
    settle(() => latest(record.closeResourceCalls).resolve()),
  'xstate.error.actor.closeAcpResources': ({ event }): Promise<void> =>
    settle(() => {
      if ('error' in event)
        latest(record.closeResourceCalls).reject(event.error);
    }),
  'xstate.done.actor.databaseWriter': (): void =>
    record.engine.system.get('databaseWriter').send({ type: drainWriterEvent }),
  'xstate.error.actor.databaseWriter': (): void =>
    record.engine.send(writerFailure),
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
    const sent = record.messages.length;
    vi.advanceTimersByTime(heartbeatIntervalMs - 1);
    expect(record.messages).toHaveLength(sent);
    vi.advanceTimersByTime(1);
    expect(record.messages).toHaveLength(sent + 1);
  },
  'engine.stop': (): void =>
    record.processSignals.send({ type: stopEngineEvent, reason: 'SIGTERM' }),
};
