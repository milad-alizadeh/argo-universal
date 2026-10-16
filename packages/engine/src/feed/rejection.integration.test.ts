import { assert, expect, it, onTestFinished, vi } from 'vitest';
import {
  afterRejectionRowId,
  thirdMessageRowId,
  upsertRowEvent,
  createOpenMessageChange,
  createTextAppendChange,
} from '#mocks/feed-inputs';
import { takeFeedChanges } from '#mocks/feed-observations';
import {
  publicationCases,
  publicationTurnId,
  publicationLateUpdate,
  nextTurnUpdate,
} from '#mocks/feed-publication-inputs';
import {
  database,
  appliedFeed,
  startFeedTestHost,
  createFeedRouterCaller,
  applyFeedChange,
  subscribe,
} from '#mocks/feed-suite';
import { publishTurnContent, type FeedStreamEvent } from './index';

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
  expect(
    log.mock.calls
      .map(([line]) => line)
      .filter((line) => typeof line === 'string' && line.startsWith('feed ')),
  ).toEqual([
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

it.each(publicationCases)(
  'rejects same-Turn content after publication settlement of $label and accepts newer-Turn content',
  async (scenario) => {
    await startFeedTestHost();
    assert(appliedFeed);

    for (const event of scenario.initial) appliedFeed.send(event);

    const published = publishTurnContent(appliedFeed, publicationTurnId);
    const changes: FeedStreamEvent[] = [];

    const subscription = appliedFeed.on('feed.batch', (batch) =>
      changes.push(...batch.events),
    );

    onTestFinished(() => subscription.unsubscribe());
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    onTestFinished(() => log.mockRestore());
    appliedFeed.send(publicationLateUpdate);
    await published;
    await vi.advanceTimersByTimeAsync(60);
    expect(changes).toEqual([]);
    expect(log.mock.calls).toEqual([
      [expect.stringContaining('ACP update belongs to a settled Turn')],
    ]);

    const caller = createFeedRouterCaller();

    const page = await caller.feed.page({
      sessionId: 'session-1',
      direction: 'tail',
    });

    expect(page.maxRevision).toBe(scenario.revision);
    expect(
      page.rows.filter((row) => row.sessionUpdate === 'tool_call_update'),
    ).toMatchObject(scenario.tools);
    appliedFeed.send(nextTurnUpdate);
    await vi.advanceTimersByTimeAsync(60);
    expect(changes).toMatchObject([
      { type: 'row.upsert', row: { turnId: 'next-turn', status: 'completed' } },
    ]);
    expect(
      (
        await caller.feed.page({ sessionId: 'session-1', direction: 'tail' })
      ).rows.at(-1),
    ).toMatchObject({
      turnId: 'next-turn',
      revision: scenario.nextRevision,
      state: 'settled',
      status: 'completed',
    });
  },
);
