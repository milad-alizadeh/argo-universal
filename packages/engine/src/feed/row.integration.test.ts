import { expect, it } from 'vitest';
import { storedMessage as message } from '#mocks/feed';
import {
  thirdMessageRowId,
  fifthMessageRowId,
  createOpenMessageChange,
  createTextAppendChange,
} from '#mocks/feed-inputs';
import {
  startFeedTestHost,
  createFeedRouterCaller,
  applyFeedChange,
} from '#mocks/feed-suite';
it('reads a stored row', async (): Promise<void> => {
  await startFeedTestHost();
  expect(
    await createFeedRouterCaller().feed.row({
      sessionId: 'session-1',
      id: thirdMessageRowId,
    }),
  ).toEqual(message(2));
});

it('reads the newest version of an open row before it is written', async (): Promise<void> => {
  await startFeedTestHost();
  applyFeedChange(createOpenMessageChange(fifthMessageRowId));
  applyFeedChange(createTextAppendChange(fifthMessageRowId, 'Hel'));

  expect(
    await createFeedRouterCaller().feed.row({
      sessionId: 'session-1',
      id: fifthMessageRowId,
    }),
  ).toMatchObject({ revision: 7, content: [{ type: 'text', text: 'Hel' }] });
});

it('fails with NOT_FOUND for an unknown row', async (): Promise<void> => {
  await startFeedTestHost();
  await expect(
    createFeedRouterCaller().feed.row({
      sessionId: 'session-1',
      id: 'message-9#0',
    }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
