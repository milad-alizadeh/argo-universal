import type {
  SessionMarkSeenInput,
  SessionMarkSeenOutput,
  SessionRecord,
} from '@repo/contracts';
import { session } from '@repo/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../storage';
import type { OpenSessions } from './open-sessions';
import type { QueuedSessionChange } from './session-storage';
import type { AnnouncedJob, WriterChange } from './writer-changes';

// Raises a Session's seen revision; an older revision, such as from a slower App, never lowers it. It is not capped at the stored `maxRevision`: an App shows live rows before the Writer stores them.
export class SessionSeenJob
  implements WriterJob, QueuedSessionChange, AnnouncedJob
{
  public constructor(private readonly seen: SessionMarkSeenInput) {}

  public describe(): string {
    return `mark Session ${this.seen.sessionId} seen at revision ${this.seen.revision}`;
  }

  public commit(transaction: StorageTransaction): void {
    transaction
      .update(session)
      .set({
        seenRevision: sql`max(${session.seenRevision}, ${this.seen.revision})`,
      })
      .where(eq(session.id, this.seen.sessionId))
      .run();
  }

  public projectSession(
    current: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    return current && this.seen.sessionId === sessionId
      ? {
          ...current,
          seenRevision: Math.max(current.seenRevision, this.seen.revision),
        }
      : current;
  }

  public announcedChange(): WriterChange {
    return { sessionIds: [this.seen.sessionId], turnIds: [] };
  }
}

export async function markSessionSeen(
  open: OpenSessions,
  input: SessionMarkSeenInput,
): Promise<SessionMarkSeenOutput> {
  open.readSession(input.sessionId);
  await open.write(new SessionSeenJob(input));

  return {};
}
