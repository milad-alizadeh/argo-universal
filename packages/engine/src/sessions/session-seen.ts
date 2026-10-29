import type {
  SessionMarkSeenInput,
  SessionMarkSeenOutput,
  SessionRecord,
} from '@repo/contracts';
import { session } from '@repo/db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  type StorageTransaction,
  type WriterJob,
  writeDatabaseJobAndWaitForCommit,
} from '../storage';
import type { SessionRouterDeps } from './router-deps';

// Raises a Session's seen revision; an older revision, such as from a slower App, never lowers it. It is not capped at the stored `maxRevision`: an App shows live rows before the Writer stores them.
export class SessionSeenJob implements WriterJob {
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

  public session(
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

  public changedSessionIds(): string[] {
    return [this.seen.sessionId];
  }
}

export async function markSessionSeen(
  deps: SessionRouterDeps,
  input: SessionMarkSeenInput,
): Promise<SessionMarkSeenOutput> {
  deps.readSession(input.sessionId);
  const writer = deps.findWriter();

  if (!writer) throw new Error('Database Writer is unavailable');

  await writeDatabaseJobAndWaitForCommit(writer, new SessionSeenJob(input));

  return {};
}
