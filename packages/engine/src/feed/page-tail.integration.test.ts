import { expect, it } from 'vitest';
import { storedMessage as message } from '#mocks/feed';
import { startFeedTestHost, createFeedRouterCaller } from '#mocks/feed-suite';

it('reads the newest rows in position order', async (): Promise<void> => {
  await startFeedTestHost();
  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 2,
    }),
  ).toEqual({
    epoch: 3,
    maxRevision: 5,
    rows: [message(3), message(4)],
    hasOlder: true,
    startCursor: 3,
    staleCursor: false,
  });
});

it('reads the rows before a cursor', async (): Promise<void> => {
  await startFeedTestHost();
  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'before',
      cursor: 3,
      epoch: 3,
      limit: 2,
    }),
  ).toMatchObject({
    rows: [message(1), message(2)],
    hasOlder: true,
    startCursor: 1,
    staleCursor: false,
  });
  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'before',
      cursor: 1,
      epoch: 3,
    }),
  ).toMatchObject({ rows: [message(0)], hasOlder: false, startCursor: 0 });
});
