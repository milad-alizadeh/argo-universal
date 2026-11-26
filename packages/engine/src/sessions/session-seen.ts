import type {
  SessionMarkSeenInput,
  SessionMarkSeenOutput,
  SessionRecord,
} from '@repo/contracts';
import { session } from '@repo/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../storage';
import type { HandlerSources } from './session-sources';
import type { QueuedSessionChange } from './session-storage';
import type { AnnouncedJob, WriterChange } from './writer-changes';

type SeenSources = HandlerSources<'readSession', 'write'>;

// The revision seen: one an App showed, or `end`, the Session's own `maxRevision` when the job commits.
type SeenUpTo = Pick<SessionMarkSeenInput, 'sessionId'> & {
  revision: SessionMarkSeenInput['revision'] | 'end';
};

// Raises a Session's seen revision; an older revision, such as from a slower App, never lowers it. It is not capped at the stored `maxRevision`: an App shows live rows before the Writer stores them.
class SessionSeenJob implements WriterJob, QueuedSessionChange, AnnouncedJob {
  public constructor(private readonly seen: SeenUpTo) {}

  public describe(): string {
    return `mark Session ${this.seen.sessionId} seen at revision ${this.seen.revision}`;
  }

  public commit(transaction: StorageTransaction): void {
    const revision =
      this.seen.revision === 'end' ? session.maxRevision : this.seen.revision;

    transaction
      .update(session)
      .set({ seenRevision: sql`max(${session.seenRevision}, ${revision})` })
      .where(eq(session.id, this.seen.sessionId))
      .run();
  }

  public projectSession(
    current: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    if (!current || this.seen.sessionId !== sessionId) return current;

    const revision =
      this.seen.revision === 'end' ? current.maxRevision : this.seen.revision;

    return {
      ...current,
      seenRevision: Math.max(current.seenRevision, revision),
    };
  }

  public announcedChange(): WriterChange {
    return { sessionIds: [this.seen.sessionId], turnIds: [] };
  }
}

export async function markSessionSeen(
  sources: SeenSources,
  input: SessionMarkSeenInput,
): Promise<SessionMarkSeenOutput> {
  sources.readSession(input.sessionId);
  await sources.open.write(new SessionSeenJob(input));

  return {};
}

// Marks a Session seen up to its newest revision in the same write as the Feed rows queued before it, such as a notice the person needs no news of.
export const seenAtEndJob = (sessionId: string): WriterJob =>
  new SessionSeenJob({ sessionId, revision: 'end' });
