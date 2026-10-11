import type { SessionRecord, SessionUpdate } from '@repo/contracts';
import { blob, blobRef, feedRow, session } from '@repo/db/schema';
import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import {
  readQueuedJobs,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';
import type { OutputBlob } from './acp/tool-output';
import { writeBlobFile } from './blob-files';
import { newestRows, toFeedRowWrite } from './feed-row';
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

type QueuedFeedRows = { rows: SessionUpdate[]; maxRevision: number };

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
    for (const stored of this.input.blobs ?? []) {
      if (!blobsFolder) throw new Error('Writer has no Blob folder');
      await writeBlobFile(blobsFolder, stored.blob.blobId, stored.data);
    }
  }

  public commit(transaction: StorageTransaction): void {
    this.insertOutputBlobs(transaction);
    this.upsertRows(transaction);
    this.insertBlobRefs(transaction);
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
    const titledByPrompt =
      current.titleSource === 'prompt' && current.title === '';
    return {
      ...current,
      maxRevision,
      activityAt: activityAt ?? current.activityAt,
      title: titledByPrompt ? titleFromRows(rows) : current.title,
    };
  }

  private insertOutputBlobs(transaction: StorageTransaction): void {
    for (const { blob: stored } of this.input.blobs ?? [])
      transaction
        .insert(blob)
        .values({ id: stored.blobId, mime: stored.mime, bytes: stored.bytes })
        .onConflictDoNothing()
        .run();
  }

  private upsertRows(transaction: StorageTransaction): void {
    if (this.input.rows.length === 0) return;
    transaction
      .insert(feedRow)
      .values(
        this.input.rows.map((row): typeof feedRow.$inferInsert => ({
          ...toFeedRowWrite(row),
          sessionId: this.input.sessionId,
        })),
      )
      .onConflictDoUpdate({
        target: [feedRow.sessionId, feedRow.id],
        set: feedRowUpdate,
      })
      .run();
  }

  // A ref keeps a blob from cleanup; a prompt naming no stored blob adds none.
  private insertBlobRefs(transaction: StorageTransaction): void {
    const blobIds = [
      ...(this.input.blobIds ?? []),
      ...(this.input.blobs ?? []).map((stored): string => stored.blob.blobId),
    ];
    if (blobIds.length === 0) return;
    transaction
      .insert(blobRef)
      .select(
        transaction
          .select({
            blobId: blob.id,
            sessionId: sql<string>`${this.input.sessionId}`.as('session_id'),
          })
          .from(blob)
          .where(inArray(blob.id, blobIds)),
      )
      .onConflictDoNothing()
      .run();
  }

  private advanceSession(transaction: StorageTransaction): void {
    transaction
      .update(session)
      .set({
        maxRevision: this.input.maxRevision,
        activityAt: this.input.activityAt ?? Date.now(),
        title: sql`case when ${session.titleSource} = 'prompt' and ${session.title} = '' then ${titleFromRows(this.input.rows)} else ${session.title} end`,
      })
      .where(
        and(
          eq(session.id, this.input.sessionId),
          gt(sql`${this.input.maxRevision}`, session.maxRevision),
        ),
      )
      .run();
  }
}

export type QueuedFeed = QueuedFeedRows & { highestPosition: number };

// The Feed rows of one Session the Writer holds but has not committed, newest revision of each.
export const readQueuedFeed = (
  writer: WriterActorRef | undefined,
  sessionId: string,
): QueuedFeed => {
  const batches = readQueuedJobs(writer).flatMap((job): QueuedFeedRows[] => {
    const queued =
      job instanceof FeedRowsJob ? job.queuedRows(sessionId) : undefined;
    return queued ? [queued] : [];
  });
  const rows = batches.flatMap((batch): SessionUpdate[] => batch.rows);
  return {
    rows: [...newestRows(rows).values()],
    maxRevision: Math.max(0, ...batches.map((batch) => batch.maxRevision)),
    highestPosition: Math.max(-1, ...rows.map((row) => row.position)),
  };
};

export const readQueuedFeedRow = (
  writer: WriterActorRef | undefined,
  { sessionId, id }: { sessionId: string; id: string },
): SessionUpdate | undefined =>
  readQueuedFeed(writer, sessionId).rows.find((row) => row.id === id);

// A Session row as a queued job leaves it, when the job is a Feed row job of that Session.
export const projectQueuedFeedSession = (
  job: WriterJob,
  current: SessionRecord,
): SessionRecord =>
  job instanceof FeedRowsJob && job.sessionId === current.id
    ? job.projectSession(current)
    : current;

// The Session whose row a queued Feed row job changes.
export const queuedFeedSessionId = (job: WriterJob): string | undefined =>
  job instanceof FeedRowsJob ? job.sessionId : undefined;
