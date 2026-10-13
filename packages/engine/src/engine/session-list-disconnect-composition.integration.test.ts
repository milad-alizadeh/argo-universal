import { expect, it, vi } from 'vitest';
import { finishSubscription } from '#mocks/list-observation';
import { startListReaders } from '#mocks/list-readers';
import { SessionRowUpdateJob } from '../sessions';

it('stops shared list reads with no subscribers and refreshes on reconnect', async (): Promise<void> => {
  const {
    writer,
    counted,
    first,
    second,
    counts,
    secondWatcher,
    countsWatcher,
    resumedWatcher,
  } = await startListReaders();
  await first.next();
  await second.next();
  await counts.next();
  await vi.advanceTimersByTimeAsync(100);
  await finishSubscription(first);
  secondWatcher.controller.abort();
  countsWatcher.controller.abort();
  counted.metrics.sessionReads = 0;
  writer.send({
    type: 'writer.write',
    job: new SessionRowUpdateJob({
      id: 'session-1',
      set: { title: 'No subscribers' },
    }),
  });
  await vi.advanceTimersByTimeAsync(100);
  expect(counted.metrics.sessionReads).toBe(0);
  expect(await second.next()).toMatchObject({ done: true });
  expect(await counts.next()).toMatchObject({ done: true });
  const resumed = (await resumedWatcher.caller.session.listUpdates())[
    Symbol.asyncIterator
  ]();
  expect((await resumed.next()).value).toMatchObject({
    type: 'changed',
    session: { title: 'No subscribers' },
  });
  expect(counted.metrics.sessionReads).toBe(1);
  resumedWatcher.controller.abort();
  expect(await resumed.next()).toMatchObject({ done: true });
});
