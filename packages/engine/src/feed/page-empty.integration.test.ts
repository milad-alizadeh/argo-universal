import { expect, it } from 'vitest';
import { insertSession } from '#mocks/database';
import {
  database,
  startFeedTestHost,
  createFeedRouterCaller,
} from '#mocks/feed-suite';

it('pages a Session with no rows', async (): Promise<void> => {
  await startFeedTestHost();
  insertSession(database, { id: 'session-2' });

  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-2',
      direction: 'tail',
    }),
  ).toEqual({
    epoch: 0,
    maxRevision: 0,
    rows: [],
    hasOlder: false,
    startCursor: null,
    staleCursor: false,
  });
});

it('fails with NOT_FOUND for an unknown Session', async (): Promise<void> => {
  await startFeedTestHost();
  await expect(
    createFeedRouterCaller().feed.page({
      sessionId: 'session-9',
      direction: 'tail',
    }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
