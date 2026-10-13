import { expect, it, vi } from 'vitest';
import { storedMessage as message } from '#mocks/feed';
import { fifthMessageRowId, createOpenMessageChange } from '#mocks/feed-inputs';
import {
  startFeedTestHost,
  createFeedRouterCaller,
  applyFeedChange,
} from '#mocks/feed-suite';
it('keeps the place of a stored row that a change brings back', async (): Promise<void> => {
  await startFeedTestHost();
  applyFeedChange({
    type: 'patch',
    id: 'message-3#0',
    set: { messageId: 'plan-3' },
  });
  await vi.advanceTimersByTimeAsync(0);

  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 2,
    }),
  ).toMatchObject({
    maxRevision: 6,
    rows: [{ ...message(3), revision: 6, messageId: 'plan-3' }, message(4)],
  });
});

it('reads rows that the feed actor wrote through the database writer', async (): Promise<void> => {
  await startFeedTestHost();
  applyFeedChange(createOpenMessageChange(fifthMessageRowId, 'Hi'));
  applyFeedChange({
    type: 'patch',
    id: fifthMessageRowId,
    set: { state: 'settled' },
  });
  await vi.advanceTimersByTimeAsync(0);

  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 1,
    }),
  ).toMatchObject({
    maxRevision: 7,
    rows: [
      {
        id: fifthMessageRowId,
        position: 5,
        revision: 7,
        state: 'settled',
        content: [{ type: 'text', text: 'Hi' }],
      },
    ],
  });
});
