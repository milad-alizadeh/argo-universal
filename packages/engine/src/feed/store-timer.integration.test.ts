import { expect, it, vi } from 'vitest';
import {
  storedBeforeStreamText,
  overlappingTimersRowId,
  appendRowEvent,
  createOpenMessageChange,
  createTextAppendChange,
} from '#mocks/feed-inputs';
import { takeFeedChanges } from '#mocks/feed-observations';
import {
  database,
  startFeedTestHost,
  createFeedRouterCaller,
  applyFeedChange,
  subscribe,
} from '#mocks/feed-suite';

it('persists the latest open row when the store timer expires before its next stream batch', async () => {
  await startFeedTestHost();
  const updates = await subscribe({ epoch: 3, revision: 5 });
  await updates.next();
  applyFeedChange(createOpenMessageChange(overlappingTimersRowId));
  await vi.advanceTimersByTimeAsync(950);
  await takeFeedChanges(updates, 1);
  applyFeedChange(
    createTextAppendChange(overlappingTimersRowId, storedBeforeStreamText),
  );
  let streamed = false;

  const next = takeFeedChanges(updates, 1).then((events) => {
    streamed = true;

    return events;
  });

  await vi.advanceTimersByTimeAsync(50);
  expect(streamed).toBe(false);
  expect(
    database.$client
      .prepare(
        "SELECT revision, state, json_extract(payload, '$.content[0].text') AS text FROM feed_row WHERE session_id = ? AND id = ?",
      )
      .get('session-1', overlappingTimersRowId),
  ).toEqual({ revision: 7, state: 'open', text: 'Stored first' });
  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 1,
    }),
  ).toMatchObject({
    rows: [
      {
        id: overlappingTimersRowId,
        revision: 7,
        content: [{ text: storedBeforeStreamText }],
      },
    ],
  });
  await vi.advanceTimersByTimeAsync(10);
  expect(await next).toMatchObject([
    { type: appendRowEvent, text: storedBeforeStreamText },
  ]);
});
