import type { SessionRecord, SessionUpdate } from '@repo/contracts';
import { feedRow, session } from '@repo/db/schema';
import { and, eq, gt, sql, type SQL } from 'drizzle-orm';
import { type StorageTransaction, type WriterJob } from '../storage';
import type { OutputBlob } from './acp/tool-output';
import {
  insertOutputBlobs,
  insertOutputBlobRefs,
  writeOutputBlobFiles,
} from './feed-blob-storage';
import { toFeedRowWrite } from './feed-row';
import { titleFromRows } from './prompt-title';

type FeedRowsJobInput = {
  sessionId: string;
  rows: SessionUpdate[];
  maxRevision: number;
  activityAt?: number;
  // The blobs the job's prompt rows show.
  blobIds?: string[];
  // Whole tool output the rows show as previews, stored before the rows.
  blobs?: OutputBlob[];
};

export type QueuedFeedRows = { rows: SessionUpdate[]; maxRevision: number };

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

// Changed Feed rows of one Session; borrows `blob`, `blob_ref` and the `session` revision, activity and prompt title in the same commit.
export class FeedRowsJob implements WriterJob {
  public readonly refusable = true;

  public constructor(private readonly input: FeedRowsJobInput) {}

  public describe(): string {
    return `Feed rows ${this.input.rows.map((row): string => row.id).join(', ')} of Session ${this.input.sessionId} at maxRevision ${this.input.maxRevision}`;
  }

  public stamp(now: number): FeedRowsJob {
    return new FeedRowsJob({
      ...this.input,
      activityAt: this.input.activityAt ?? now,
    });
  }

  public async writeFiles(blobsFolder: string | undefined): Promise<void> {
    await writeOutputBlobFiles(blobsFolder, this.input.blobs ?? []);
  }

  public commit(transaction: StorageTransaction): void {
    insertOutputBlobs(transaction, this.input.blobs ?? []);
    this.upsertRows(transaction);
    insertOutputBlobRefs(transaction, this.input);
    this.advanceSession(transaction);
  }

  public queuedRows(sessionId: string): QueuedFeedRows | undefined {
    return this.input.sessionId === sessionId ? this.input : undefined;
  }

  public get sessionId(): string {
    return this.input.sessionId;
  }

  // What the commit writes to its Session's row, as `advanceSession` does.
  public projectSession(current: SessionRecord): SessionRecord {
    const { maxRevision, activityAt, rows } = this.input;

    if (maxRevision <= current.maxRevision) return current;

    return {
      ...current,
      maxRevision,
      activityAt: activityAt ?? current.activityAt,
      title: projectedPromptTitle(current, rows),
    };
  }

  private upsertRows(transaction: StorageTransaction): void {
    if (this.input.rows.length === 0) return;
    transaction
      .insert(feedRow)
      .values(this.rowWrites())
      .onConflictDoUpdate({
        target: [feedRow.sessionId, feedRow.id],
        set: feedRowUpdate,
      })
      .run();
  }

  private rowWrites(): (typeof feedRow.$inferInsert)[] {
    return this.input.rows.map((row): typeof feedRow.$inferInsert => ({
      ...toFeedRowWrite(row),
      sessionId: this.input.sessionId,
    }));
  }

  private newerRevisionFilter(): SQL | undefined {
    return and(
      eq(session.id, this.input.sessionId),
      gt(sql`${this.input.maxRevision}`, session.maxRevision),
    );
  }

  private advanceSession(transaction: StorageTransaction): void {
    transaction
      .update(session)
      .set({
        maxRevision: this.input.maxRevision,
        activityAt: this.input.activityAt ?? Date.now(),
        title: sql`case when ${session.titleSource} = 'prompt' and ${session.title} = '' then ${titleFromRows(this.input.rows)} else ${session.title} end`,
      })
      .where(this.newerRevisionFilter())
      .run();
  }
}

function projectedPromptTitle(
  current: SessionRecord,
  rows: SessionUpdate[],
): string {
  if (current.titleSource !== 'prompt') return current.title;

  return current.title === '' ? titleFromRows(rows) : current.title;
}
