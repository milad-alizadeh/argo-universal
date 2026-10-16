import { feedRow } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { tool } from '#mocks/live-header-tool';
import { startSnapshotHost } from '#mocks/session-snapshot';
import { FeedRowsJob, toFeedRowWrite } from '../../feed';
import { createLiveHeaderRowsReader } from './rows';

// A live Feed actor is the only producer of its rows, so the reader takes its copy unchecked; these copies break that on purpose.
it("keeps the Feed actor's copy of a row over newer stored and queued copies", async (): Promise<void> => {
  const host = startSnapshotHost();
  const memory = { ...tool, revision: 2 };

  const settled = {
    ...tool,
    status: 'completed' as const,
    state: 'settled' as const,
  };

  host.database
    .insert(feedRow)
    .values({
      ...toFeedRowWrite({ ...settled, revision: 3 }),
      sessionId: 'session-1',
    })
    .run();
  host.write(
    new FeedRowsJob({
      sessionId: 'session-1',
      rows: [{ ...settled, revision: 4 }],
      maxRevision: 4,
    }),
  );
  await host.failWrites('feed_row');

  expect(
    createLiveHeaderRowsReader(host)({
      writer: host.writer,
      sessionId: 'session-1',
      turnId: 'turn-1',
      rows: { 'tool-1': memory },
    }),
  ).toEqual({ rows: { 'tool-1': memory }, rejected: false });
});
