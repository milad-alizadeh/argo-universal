import type { ChangesSummary, SessionRecord } from '@repo/contracts';
import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { StorageTransaction, WriterActorRef, WriterJob } from '../storage';
import { readSessionRow } from './session-record';
import type { QueuedSessionChange } from './session-storage';
import type { AnnouncedJob, WriterChange } from './writer-changes';

// The Checkout totals a stored row holds; null until a read stores them.
export function storedChanges(row: SessionRecord): ChangesSummary | null {
  const { changesFiles, changesAdditions, changesDeletions } = row;

  if (
    changesFiles === null ||
    changesAdditions === null ||
    changesDeletions === null
  )
    return null;

  return {
    files: changesFiles,
    additions: changesAdditions,
    deletions: changesDeletions,
  };
}

const sameChanges = (
  first: ChangesSummary | null,
  second: ChangesSummary,
): boolean =>
  first?.files === second.files &&
  first.additions === second.additions &&
  first.deletions === second.deletions;

// Stores the Checkout totals a read produced, so the Session list shows them while the Session is closed.
class SessionChangesJob
  implements WriterJob, QueuedSessionChange, AnnouncedJob
{
  public constructor(
    private readonly sessionId: string,
    private readonly changes: ChangesSummary,
  ) {}

  public describe(): string {
    return `store Session ${this.sessionId} Checkout totals`;
  }

  public commit(transaction: StorageTransaction): void {
    transaction
      .update(session)
      .set({
        changesFiles: this.changes.files,
        changesAdditions: this.changes.additions,
        changesDeletions: this.changes.deletions,
      })
      .where(eq(session.id, this.sessionId))
      .run();
  }

  public projectSession(
    current: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    return current && this.sessionId === sessionId
      ? {
          ...current,
          changesFiles: this.changes.files,
          changesAdditions: this.changes.additions,
          changesDeletions: this.changes.deletions,
        }
      : current;
  }

  public announcedChange(): WriterChange {
    return { sessionIds: [this.sessionId], turnIds: [] };
  }
}

interface ChangesStoreSources {
  database: Database;
  writer: WriterActorRef | undefined;
}

// Queues the totals for the Writer unless the row, as the Writer will leave it, already holds them.
export function storeSessionChanges(
  sources: ChangesStoreSources,
  sessionId: string,
  changes: ChangesSummary,
): void {
  const { writer } = sources;
  const current = readSessionRow({ ...sources, writer }, sessionId);

  if (!writer || !current) return;

  if (sameChanges(storedChanges(current), changes)) return;

  writer.send({
    type: 'writer.write',
    job: new SessionChangesJob(sessionId, changes),
  });
}
