import type { DelayEvent } from '@repo/vitest/model-test';
import type { EventExecutor } from 'xstate/graph';
import {
  checkRunningDoneEvent,
  readAddressDoneEvent,
  readAddressErrorEvent,
  readError,
  type ServerEvent,
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
} from './server-machine.mocks';

export const executors = {
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

    return settle((): void => latest(checkRunningCalls).resolve(event.output));
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
} satisfies Record<
  string,
  EventExecutor<ServerSnapshot, ServerEvent | DelayEvent>
>;
