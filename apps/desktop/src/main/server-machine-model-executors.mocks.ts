import { expect, vi } from 'vitest';
import type { EventExecutor } from 'xstate/graph';
import {
  checkRunningDoneEvent,
  readAddressDoneEvent,
  readAddressErrorEvent,
  readError,
  type ServerEvent,
  types,
} from './server-machine-model-events.mocks';
import {
  checkRunningCalls,
  countsChangedEvent,
  expectBadge,
  latest,
  quitCalls,
  quitDoneEvent,
  quitErrorEvent,
  readAddressCalls,
  reportExited,
  reportSpawned,
  retryServerEvent,
  server,
  type ServerSnapshot,
  settle,
  startServerMachine,
} from './server-machine.mocks';

// Fires timers in order until the delayed transition has run; an earlier `pollDelay` may fire on the way.
const fireDelay: EventExecutor<ServerSnapshot, ServerEvent> = async ({
  state,
}): Promise<void> => {
  for (let timers = 0; timers < 5; timers++) {
    await vi.advanceTimersToNextTimerAsync();
    const actual = server.getSnapshot().value;

    if (JSON.stringify(actual) === JSON.stringify(state.value)) return;
  }

  expect.unreachable(`${JSON.stringify(state.value)} was never reached`);
};

export const executors = new Map(
  Object.entries({
    'xstate.init': (): void => {
      startServerMachine();
    },
    [readAddressDoneEvent]: ({ event }): Promise<void> => {
      if (event.type !== readAddressDoneEvent)
        throw new Error('Expected address result');

      return settle((): void => latest(readAddressCalls).resolve(event.output));
    },
    [readAddressErrorEvent]: (): Promise<void> =>
      settle((): void => latest(readAddressCalls).reject(readError)),
    [checkRunningDoneEvent]: ({ event }): Promise<void> => {
      if (event.type !== checkRunningDoneEvent)
        throw new Error('Expected process result');

      return settle((): void =>
        latest(checkRunningCalls).resolve(event.output),
      );
    },
    'server.spawned': reportSpawned,
    'server.exited': reportExited,
    'server.retry': (): void => server.send({ type: retryServerEvent }),
    'app.quit': (): void => server.send({ type: 'app.quit' }),
    [countsChangedEvent]: ({ event }): void => {
      if (event.type !== countsChangedEvent) throw new Error('Expected counts');
      server.send(event);
      expectBadge(event.counts.attention);
    },
    'counts.disconnected': (): void => {
      server.send({ type: 'counts.disconnected' });
      expectBadge(0);
    },
    [quitDoneEvent]: async ({ event }): Promise<void> => {
      if (event.type !== quitDoneEvent) throw new Error('Expected quit answer');
      await settle(() => latest(quitCalls).resolve(event.output));
    },
    [quitErrorEvent]: (): Promise<void> =>
      settle(() => latest(quitCalls).reject(readError)),
    ...Object.fromEntries(
      types.flatMap(
        (type): [string, EventExecutor<ServerSnapshot, ServerEvent>][] =>
          type.startsWith('xstate.after.') ? [[type, fireDelay]] : [],
      ),
    ),
  } satisfies Record<string, EventExecutor<ServerSnapshot, ServerEvent>>),
);
