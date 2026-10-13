import { expect, it } from 'vitest';
import { storedMessage as message } from '#mocks/feed';
import { startFeedTestHost, createFeedRouterCaller } from '#mocks/feed-suite';
it('answers a cursor from another epoch with the tail', async (): Promise<void> => {
  await startFeedTestHost();
  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'before',
      cursor: 2,
      epoch: 2,
      limit: 1,
    }),
  ).toMatchObject({
    epoch: 3,
    rows: [message(4)],
    startCursor: 4,
    staleCursor: true,
  });
});

it('flags a tail request from another epoch', async (): Promise<void> => {
  await startFeedTestHost();
  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      epoch: 2,
      limit: 1,
    }),
  ).toMatchObject({ epoch: 3, rows: [message(4)], staleCursor: true });
});
