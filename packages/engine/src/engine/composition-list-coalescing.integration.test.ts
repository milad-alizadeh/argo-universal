import { agentAdapters } from '@repo/agents';
import { expect, it, vi } from 'vitest';
import {
  startCountedList,
  watchList,
  useListTimers,
} from '#mocks/composition-list';
import { SessionRowUpdateJob } from '../sessions';

it.each(agentAdapters)(
  'shares one coalesced list read for three subscribers across fifty changes for $agent',
  async ({ agent }): Promise<void> => {
    const { host, counted } = await startCountedList(agent);
    const first = await watchList(host);
    const second = await watchList(host);
    const counts = (await second.caller.session.counts())[
      Symbol.asyncIterator
    ]();
    useListTimers();
    expect((await first.updates.next()).value).toMatchObject({
      type: 'changed',
      session: { sessionId: 'session-1' },
    });
    expect((await second.updates.next()).value).toMatchObject({
      type: 'changed',
      session: { sessionId: 'session-1' },
    });
    expect((await counts.next()).value).toEqual({ attention: 0, running: 0 });
    expect(counted.metrics.sessionReads).toBe(1);
    await vi.advanceTimersByTimeAsync(100);
    counted.metrics.sessionReads = 0;
    const changes = Promise.all([
      first.updates.next(),
      second.updates.next(),
      counts.next(),
    ]);
    for (let index = 1; index <= 50; index += 1)
      host.databaseWriter.send({
        type: 'writer.write',
        job: new SessionRowUpdateJob({
          id: 'session-1',
          set: { title: `Change ${index}`, maxRevision: index },
        }),
      });
    await vi.advanceTimersByTimeAsync(99);
    expect(counted.metrics.sessionReads).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(counted.metrics.sessionReads).toBe(1);
    expect(await changes).toMatchObject([
      {
        value: {
          type: 'changed',
          session: { title: 'Change 50', status: 'unread' },
        },
      },
      {
        value: {
          type: 'changed',
          session: { title: 'Change 50', status: 'unread' },
        },
      },
      { value: { attention: 1, running: 0 } },
    ]);
  },
);
