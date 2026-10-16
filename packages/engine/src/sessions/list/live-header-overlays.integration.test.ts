import { feedRow } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { tool } from '#mocks/live-header-tool';
import { FeedRowsJob, toFeedRowWrite } from '../../feed';
import { writerMachine } from '../../storage';
import { toLiveHeader } from './live-header';
import { createLiveHeaderRowsReader } from './live-header-rows';

it('keeps the earlier running Tool call after writer and memory overlays complete the newer one', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);

  const newer = {
    ...tool,
    id: 'tool-2',
    toolCallId: 'tool-2',
    position: 2,
    revision: 2,
  };

  for (const row of [tool, newer])
    database
      .insert(feedRow)
      .values({ ...toFeedRowWrite(row), sessionId: 'session-1' })
      .run();
  database.$client
    .exec(`CREATE TRIGGER hold_header_write BEFORE INSERT ON feed_row
    BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);

  const writer = createActor(writerMachine, {
    input: { now: (): number => Date.now(), database },
  }).start();

  onTestFinished((): void => {
    writer.stop();
  });
  writer.send({
    type: 'writer.write',
    job: new FeedRowsJob({
      sessionId: 'session-1',
      maxRevision: 3,
      rows: [{ ...newer, revision: 3, title: 'Queued title' }],
    }),
  });
  await waitFor(writer, (snapshot): boolean =>
    snapshot.matches('waitingToRetry'),
  );

  const completed = {
    ...newer,
    revision: 4,
    status: 'completed' as const,
    state: 'settled' as const,
  };

  const rows = createLiveHeaderRowsReader({ database })({
    writer,
    sessionId: 'session-1',
    turnId: 'turn-1',
    rows: { 'tool-2': completed },
  }).rows;

  expect(rows).toEqual({ 'tool-1': tool, 'tool-2': completed });
  expect(
    toLiveHeader(
      {
        activeTurnId: 'turn-1',
        activeTurnStartedAt: 100,
        permissionQueue: [],
        elicitationQueue: [],
      },
      Object.values(rows),
    ),
  ).toEqual({
    text: 'Reading first.ts',
    source: { type: 'tool_call', toolCallId: 'tool-1' },
    startedAt: 100,
  });
});
