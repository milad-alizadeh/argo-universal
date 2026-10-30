import type { DelayEvent } from '@repo/vitest/model-test';
import { expect } from 'vitest';
import type { EventExecutor } from 'xstate/graph';
import {
  checkRunningDoneEvent,
  readAddressDoneEvent,
  readAddressErrorEvent,
  readError,
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
    // On the way out the disconnect answers the App's own release, so it clears no badge and keeps the Session count the question needs.
    const kept = server.getSnapshot().matches({ ready: 'releasing' })
      ? badges.at(-1)
      : 0;

    server.send({ type: 'counts.disconnected' });
    expectBadge(kept);
  },
  'counts.released': (): void => {
    const kept = badges.at(-1);
    server.send({ type: 'counts.released' });
    // Letting go on the way out touches no badge.
    expectBadge(kept);
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
