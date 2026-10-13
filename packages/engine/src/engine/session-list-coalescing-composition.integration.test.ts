import { expect, it, vi } from 'vitest';
import { finishSubscription } from '#mocks/list-observation';
import { startListReaders } from '#mocks/list-readers';
import { SessionRowUpdateJob } from '../sessions';

const writerWriteEvent = 'writer.write';

it('shares one coalesced list read for three subscribers across fifty changes', async (): Promise<void> => {
  const { writer, counted, first, second, counts } = await startListReaders();
  expect((await first.next()).value).toMatchObject({
    type: 'changed',
    session: { sessionId: 'session-1' },
  });
  expect((await second.next()).value).toMatchObject({
    type: 'changed',
    session: { sessionId: 'session-1' },
  });
  expect((await counts.next()).value).toEqual({ attention: 0, running: 0 });
  expect(counted.metrics.sessionReads).toBe(1);
  await vi.advanceTimersByTimeAsync(100);
  counted.metrics.sessionReads = 0;
  const firstChange = first.next();
  const secondChange = second.next();
  const nextCounts = counts.next();
  for (let index = 1; index <= 50; index += 1)
    writer.send({
      type: writerWriteEvent,
      job: new SessionRowUpdateJob({
        id: 'session-1',
        set: { title: `Change ${index}`, maxRevision: index },
      }),
    });
  await vi.advanceTimersByTimeAsync(99);
  expect(counted.metrics.sessionReads).toBe(0);
  await vi.advanceTimersByTimeAsync(1);
  expect(counted.metrics.sessionReads).toBe(1);
  expect((await firstChange).value).toMatchObject({
    type: 'changed',
    session: { title: 'Change 50', status: 'unread' },
  });
  expect((await secondChange).value).toMatchObject({
    type: 'changed',
    session: { title: 'Change 50', status: 'unread' },
  });
  expect((await nextCounts).value).toEqual({ attention: 1, running: 0 });
});

it('keeps shared list readers active after one subscriber disconnects', async (): Promise<void> => {
  const { writer, counted, first, second, counts } = await startListReaders();
  await first.next();
  await second.next();
  await counts.next();
  await vi.advanceTimersByTimeAsync(100);
  writer.send({
    type: writerWriteEvent,
    job: new SessionRowUpdateJob({ id: 'session-1', set: { maxRevision: 50 } }),
  });
  await vi.advanceTimersByTimeAsync(100);
  await first.next();
  await second.next();
  expect((await counts.next()).value).toEqual({ attention: 1, running: 0 });
  expect(await finishSubscription(first)).toMatchObject({ done: true });
  counted.metrics.sessionReads = 0;
  const survivorChange = second.next();
  const survivorCounts = counts.next();
  writer.send({
    type: writerWriteEvent,
    job: new SessionRowUpdateJob({
      id: 'session-1',
      set: { title: 'Survives one disconnect', seenRevision: 50 },
    }),
  });
  await vi.advanceTimersByTimeAsync(100);
  expect(counted.metrics.sessionReads).toBe(1);
  expect((await survivorChange).value).toMatchObject({
    type: 'changed',
    session: { title: 'Survives one disconnect' },
  });
  expect((await survivorCounts).value).toEqual({ attention: 0, running: 0 });
});
