import type { SessionRecord, SessionUpdate } from '@repo/contracts';
import type { StorageTransaction, WriterJob } from '../storage';
import type { OutputBlob } from './acp/tool-output';
import type { BlobHoldingJob } from './blob-receipt.machine';
import {
  insertOutputBlobs,
  insertOutputBlobRefs,
  writeOutputBlobFiles,
} from './feed-blob-storage';
import {
  advanceFeedSession,
  type FeedRowsWrite,
  upsertFeedRows,
} from './feed-rows-write';
import type { QueuedFeedJob, QueuedFeedRows } from './feed-storage';
import { titleFromRows } from './prompt-title';

// The Sessions and Turns a job changes, as Session reads' announcer names them.
type AnnouncedChange = { sessionIds: string[]; turnIds: string[] };

type FeedRowsJobInput = FeedRowsWrite & {
  // The blobs the job's prompt rows show.
  blobIds?: string[];
  // Whole tool output the rows show as previews, stored before the rows.
  blobs?: OutputBlob[];
};

// The live Feed's changed rows of one Session, queued on the Writer; borrows `blob`, `blob_ref` and the `session` revision, activity and prompt title in the same commit. Session reads see that Session row through `projectSession` and `announcedChange`, the members their roles name.
export class FeedRowsJob implements WriterJob, QueuedFeedJob, BlobHoldingJob {
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
    upsertFeedRows(transaction, this.input);
    insertOutputBlobRefs(transaction, this.input);
    advanceFeedSession(transaction, this.input);
  }

  public queuedFeedRows(): QueuedFeedRows {
    const { sessionId, rows, maxRevision } = this.input;

    return { sessionId, rows, maxRevision };
  }

  public holdsBlob(blobId: string): boolean {
    return (this.input.blobs ?? []).some(({ blob }) => blob.blobId === blobId);
  }

  public announcedChange(): AnnouncedChange {
    return { sessionIds: [this.input.sessionId], turnIds: [] };
  }

  public projectSession(
    current: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    return this.isOwnRow(current, sessionId)
      ? this.advanceSession(current)
      : current;
  }

  // Whether the row asked for is this job's Session row.
  private isOwnRow(
    current: SessionRecord | undefined,
    sessionId: string,
  ): current is SessionRecord {
    return current?.id === sessionId && sessionId === this.input.sessionId;
  }

  // What the commit writes to its Session's row, as `advanceFeedSession` does.
  private advanceSession(current: SessionRecord): SessionRecord {
    const { maxRevision, activityAt, rows } = this.input;

    if (maxRevision <= current.maxRevision) return current;

    return {
      ...current,
      maxRevision,
      activityAt: activityAt ?? current.activityAt,
      title: projectedPromptTitle(current, rows),
    };
  }
}

function projectedPromptTitle(
  current: SessionRecord,
  rows: SessionUpdate[],
): string {
  if (current.titleSource !== 'prompt') return current.title;

  return current.title === '' ? titleFromRows(rows) : current.title;
}
