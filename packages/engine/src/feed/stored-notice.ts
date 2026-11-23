import type { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { StorageTransaction } from '../storage';
import { nextFeedRevision } from './feed-revision';
import { highestFeedPosition } from './feed-row';
import { FeedRowsJob } from './feed-rows-job';
import { writeFeedRowsInTransaction } from './feed-rows-write';
import type { QueuedFeed } from './feed-storage';

type StoredNotice = Pick<
  Extract<SessionUpdate, { sessionUpdate: 'notice' }>,
  'id' | 'severity' | 'title' | 'description' | '_meta'
>;

// Used after a Feed has closed and its live rows have settled.
export function appendStoredNotice(
  transaction: StorageTransaction,
  sessionId: string,
  notice: StoredNotice,
): void {
  const row = storedRevision(transaction, sessionId);

  if (!row) return;

  const revision = nextFeedRevision(row.maxRevision);

  const position = highestFeedPosition(transaction, sessionId) + 1;
  const rows = [noticeRow(notice, { sessionId, revision, position })];

  const write = { sessionId, maxRevision: revision, rows };
  writeFeedRowsInTransaction(transaction, write);
}

interface QueuedNotice {
  sessionId: string;
  notice: StoredNotice;
  queued: QueuedFeed;
  maxRevision: number;
}

// A closed Session can open before the Writer commits. Its loader reads queued Feed rows too.
export function queuedNoticeJob(
  database: Database,
  { sessionId, notice, queued, maxRevision }: QueuedNotice,
): FeedRowsJob {
  const revision = nextFeedRevision(Math.max(queued.maxRevision, maxRevision));

  const position =
    Math.max(highestFeedPosition(database, sessionId), queued.highestPosition) +
    1;

  return new FeedRowsJob({
    sessionId,
    maxRevision: revision,
    rows: [noticeRow(notice, { sessionId, position, revision })],
  });
}

const noticeRow = (
  notice: StoredNotice,
  location: { sessionId: string; revision: number; position: number },
): SessionUpdate => ({
  ...notice,
  ...location,
  turnId: null,
  sessionUpdate: 'notice',
  state: 'settled',
});

const storedRevision = (
  transaction: StorageTransaction,
  id: string,
): { maxRevision: number } | undefined =>
  transaction
    .select({ maxRevision: session.maxRevision })
    .from(session)
    .where(eq(session.id, id))
    .get();
