import { agentAdapters } from '@repo/agents';
import { expect, it, vi } from 'vitest';
import {
  startCountedList,
  watchList,
  useListTimers,
} from '#mocks/composition-list';
import { closeSubscription } from '#mocks/composition-subscriptions';
import { SessionRowUpdateJob } from '../sessions';

const sessionId = 'session-1';

it.each(agentAdapters)(
  'keeps publishing list changes and counts after one subscriber disconnects for $agent',
  async ({ agent }): Promise<void> => {
    const { host, counted } = await startCountedList(agent);
    host.databaseWriter.send({
      type: 'writer.write',
      job: new SessionRowUpdateJob({
        id: sessionId,
        set: { maxRevision: 50 },
      }),
    });
    const first = await watchList(host);
    const second = await watchList(host);
    const counts = (await second.caller.session.counts())[
      Symbol.asyncIterator
    ]();
    await first.updates.next();
    await second.updates.next();
    await counts.next();
    useListTimers();
    await vi.advanceTimersByTimeAsync(100);
    await closeSubscription(first.updates);
    expect(await first.updates.next()).toMatchObject({ done: true });
    counted.metrics.sessionReads = 0;
    const changes = Promise.all([second.updates.next(), counts.next()]);
    host.databaseWriter.send({
      type: 'writer.write',
      job: new SessionRowUpdateJob({
        id: sessionId,
        set: { title: 'Survives one disconnect', seenRevision: 50 },
      }),
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(counted.metrics.sessionReads).toBe(1);
    expect(await changes).toMatchObject([
      {
        value: {
          type: 'changed',
          session: { title: 'Survives one disconnect' },
        },
      },
      { value: { attention: 0, running: 0 } },
    ]);
  },
);

it.each(agentAdapters)(
  'stops reading without subscribers and refreshes when a subscriber returns for $agent',
  async ({ agent }): Promise<void> => {
    const { host, counted } = await startCountedList(agent);
    const watched = await watchList(host);
    const counts = (await watched.caller.session.counts())[
      Symbol.asyncIterator
    ]();
    await watched.updates.next();
    await counts.next();
    useListTimers();
    await vi.advanceTimersByTimeAsync(100);
    watched.controller.abort();
    counted.metrics.sessionReads = 0;
    host.databaseWriter.send({
      type: 'writer.write',
      job: new SessionRowUpdateJob({
        id: sessionId,
        set: { title: 'No subscribers' },
      }),
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(counted.metrics.sessionReads).toBe(0);
    expect(await watched.updates.next()).toMatchObject({ done: true });
    expect(await counts.next()).toMatchObject({ done: true });
    const resumed = await watchList(host);
    expect((await resumed.updates.next()).value).toMatchObject({
      type: 'changed',
      session: { title: 'No subscribers' },
    });
    expect(counted.metrics.sessionReads).toBe(1);
    resumed.controller.abort();
    expect(await resumed.updates.next()).toMatchObject({ done: true });
  },
);
