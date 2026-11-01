import type { DelayEvent } from '@repo/vitest/model-test';
import { expect } from 'vitest';
import type { EventExecutor } from 'xstate/graph';
import {
  checkRunningDoneEvent,
  readAddressDoneEvent,
  readAddressErrorEvent,
  readError,
  readStoredDoneEvent,
  readStoredErrorEvent,
  type ServerEvent,
} from './server-machine-model-events.mocks';
import {
  badges,
  checkRunningCalls,
  countsChangedEvent,
  latest,
  quitCalls,
  quitDoneEvent,
  quitErrorEvent,
  readAddressCalls,
  readStoredCalls,
  reportExited,
  reportSpawned,
  retryServerEvent,
  server,
  type ServerSnapshot,
  settle,
} from './server-machine.mocks';

const expectBadge = (attention: number | undefined): void => {
  expect(badges.at(-1)).toBe(attention);
};

const sendAndExpectBadge = (
  event: { type: 'counts.disconnected' } | { type: 'counts.released' },
  attention: number | undefined,
): void => {
  server.send(event);
  expectBadge(attention);
};

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
  [readStoredDoneEvent]: ({ event }): Promise<void> => {
    if (event.type !== readStoredDoneEvent)
      throw new Error('Expected stored setting');

    return settle((): void => latest(readStoredCalls).resolve(event.output));
  },
  [readStoredErrorEvent]: (): Promise<void> =>
    settle((): void => latest(readStoredCalls).reject(readError)),
  'server.spawned': reportSpawned,
  'server.exited': reportExited,
  'server.retry': (): void => server.send({ type: retryServerEvent }),
  'app.quit': (): void => server.send({ type: 'app.quit' }),
  [countsChangedEvent]: ({ event }): void => {
    if (event.type !== countsChangedEvent) throw new Error('Expected counts');
    server.send(event);
    expectBadge(event.counts.attention);
  },
  'keepRunning.changed': ({ event }): void => {
    if (event.type !== 'keepRunning.changed')
      throw new Error('Expected keep running');
    server.send(event);
  },
  // On the way out a disconnect answers the App's own release, so it clears no badge and keeps the Session count the question needs.
  'counts.disconnected': (): void =>
    sendAndExpectBadge(
      { type: 'counts.disconnected' },
      server.getSnapshot().matches({ ready: 'releasing' }) ? badges.at(-1) : 0,
    ),
  'counts.released': (): void =>
    sendAndExpectBadge({ type: 'counts.released' }, badges.at(-1)),
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
