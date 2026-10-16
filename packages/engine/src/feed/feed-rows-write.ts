import type { SessionUpdate } from '@repo/contracts';
import { feedRow, session } from '@repo/db/schema';
import { and, eq, gt, sql, type SQL } from 'drizzle-orm';
import type { StorageTransaction } from '../storage';
import { toFeedRowWrite } from './feed-row';
import { titleFromRows } from './prompt-title';

export type FeedRowsWrite = {
  sessionId: string;
  rows: SessionUpdate[];
  maxRevision: number;
  activityAt?: number;
};

// A row keeps the position it was first written at, so an update leaves `position` alone.
const feedRowUpdate = {
  sessionUpdate: sql`excluded.session_update`,
  revision: sql`excluded.revision`,
  turnId: sql`excluded.turn_id`,
  state: sql`excluded.state`,
  payload: sql`excluded.payload`,
  payloadVersion: sql`excluded.payload_version`,
  sourceRef: sql`excluded.source_ref`,
  searchText: sql`excluded.search_text`,
};

const rowWrites = (write: FeedRowsWrite): (typeof feedRow.$inferInsert)[] =>
  write.rows.map((row): typeof feedRow.$inferInsert => ({
    ...toFeedRowWrite(row),
    sessionId: write.sessionId,
  }));

export const upsertFeedRows = (
  transaction: StorageTransaction,
  write: FeedRowsWrite,
): void => {
  if (write.rows.length === 0) return;
  transaction
    .insert(feedRow)
    .values(rowWrites(write))
    .onConflictDoUpdate({
      target: [feedRow.sessionId, feedRow.id],
      set: feedRowUpdate,
    })
    .run();
};

const newerRevisionFilter = (write: FeedRowsWrite): SQL | undefined =>
  and(
    eq(session.id, write.sessionId),
    gt(sql`${write.maxRevision}`, session.maxRevision),
  );

export const advanceFeedSession = (
  transaction: StorageTransaction,
  write: FeedRowsWrite,
): void => {
  transaction
    .update(session)
    .set({
      maxRevision: write.maxRevision,
      activityAt: write.activityAt ?? Date.now(),
      title: sql`case when ${session.titleSource} = 'prompt' and ${session.title} = '' then ${titleFromRows(write.rows)} else ${session.title} end`,
    })
    .where(newerRevisionFilter(write))
    .run();
};

// Startup recovery and archive settlement lend a transaction and write here, never as a queued `FeedRowsJob`, so their Turn endings are not live.
export const writeBorrowedFeedRows = (
  transaction: StorageTransaction,
  write: FeedRowsWrite,
): void => {
  upsertFeedRows(transaction, write);
  advanceFeedSession(transaction, write);
};
