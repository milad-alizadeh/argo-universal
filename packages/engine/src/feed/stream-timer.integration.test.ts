import { expect, it, vi } from 'vitest';
import {
  appendRowEvent,
  upsertRowEvent,
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
import { storeDelay, streamBatchDelay } from './feed-machine';

const firstAdvance = Math.floor(streamBatchDelay / 2);

it('streams buffered Agent changes after the stream batch delay while SQL waits for the store timer', async () => {
  await startFeedTestHost();
  const updates = await subscribe({ epoch: 3, revision: 5 });
  await updates.next();
  let received = false;

  const next = takeFeedChanges(updates, 2).then((events) => {
    received = true;

    return events;
  });

  applyFeedChange(createOpenMessageChange('timed-row'));
  await vi.advanceTimersByTimeAsync(firstAdvance);
  applyFeedChange(createTextAppendChange('timed-row', 'Hello'));
  await vi.advanceTimersByTimeAsync(streamBatchDelay - firstAdvance - 1);
  expect(received).toBe(false);
  expect(
    database.$client
      .prepare('SELECT id FROM feed_row WHERE id = ?')
      .get('timed-row'),
  ).toBeUndefined();
  await vi.advanceTimersByTimeAsync(1);
  expect((await next).map((event) => event.type)).toEqual([
    upsertRowEvent,
    appendRowEvent,
  ]);
  await vi.advanceTimersByTimeAsync(storeDelay - streamBatchDelay - 1);
  expect(
    database.$client
      .prepare('SELECT id FROM feed_row WHERE id = ?')
      .get('timed-row'),
  ).toBeUndefined();
  await vi.advanceTimersByTimeAsync(1);
  expect(
    database.$client
      .prepare(
        "SELECT revision, state, json_extract(payload, '$.content[0].text') AS text FROM feed_row WHERE session_id = ? AND id = ?",
      )
      .get('session-1', 'timed-row'),
  ).toEqual({ revision: 7, state: 'open', text: 'Hello' });
  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 1,
    }),
  ).toMatchObject({
    rows: [
      {
        id: 'timed-row',
        revision: 7,
        state: 'open',
        content: [{ text: 'Hello' }],
      },
    ],
  });
});
