import { expect, it, onTestFinished, vi } from 'vitest';
import {
  afterRejectionRowId,
  thirdMessageRowId,
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
it('rejects unreadable and missing stored rows without writing changes, then accepts the next Agent row', async () => {
  await startFeedTestHost();
  const updates = await subscribe({ epoch: 3, revision: 5 });
  await updates.next();
  let streamed = false;
  const firstChange = takeFeedChanges(updates, 1).then((events) => {
    streamed = true;
    return events;
  });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  onTestFinished(() => log.mockRestore());
  database.$client
    .prepare('UPDATE feed_row SET payload = ? WHERE id = ?')
    .run('{}', thirdMessageRowId);
  applyFeedChange(createTextAppendChange(thirdMessageRowId, 'Rejected'));
  applyFeedChange(createTextAppendChange('missing-row', 'Rejected'));
  await vi.advanceTimersByTimeAsync(1000);
  expect(
    database.$client
      .prepare('SELECT max_revision FROM session WHERE id = ?')
      .get('session-1'),
  ).toMatchObject({ max_revision: 5 });
  expect(streamed).toBe(false);
  expect(log.mock.calls.map(([line]) => line)).toEqual([
    expect.stringContaining('could not read written row message-2#0'),
    expect.stringContaining('no row missing-row'),
  ]);
  applyFeedChange(
    createOpenMessageChange(afterRejectionRowId, 'Still working'),
  );
  applyFeedChange({
    type: 'patch',
    id: afterRejectionRowId,
    set: { state: 'settled' },
  });
  await vi.advanceTimersByTimeAsync(60);
  expect(await firstChange).toMatchObject([
    { type: upsertRowEvent, row: { id: afterRejectionRowId } },
  ]);
  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 1,
    }),
  ).toMatchObject({
    maxRevision: 7,
    rows: [{ id: afterRejectionRowId, content: [{ text: 'Still working' }] }],
  });
});
