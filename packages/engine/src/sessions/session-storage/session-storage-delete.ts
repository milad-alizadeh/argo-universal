import type { SessionRecord } from '@repo/contracts';
import { session } from '@repo/db/schema';
import { sql } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../../storage';
import type { AnnouncedJob, WriterChange } from '../writer-changes';
import type { QueuedSessionChange } from './queued-roles';

// Removes a Session no prompt reached; its Turns, Feed rows and Blobs go with it.
export class SessionDeleteJob
  implements WriterJob, QueuedSessionChange, AnnouncedJob
{
  public constructor(private readonly sessionId: string) {}

  public describe(): string {
    return `delete Session ${this.sessionId}`;
  }

  public commit(transaction: StorageTransaction): void {
    transaction.run(sql`
      WITH RECURSIVE discarded(id) AS (
        SELECT ${session.id} FROM ${session} WHERE ${session.id} = ${this.sessionId}
        UNION
        SELECT child.id FROM session AS child
        JOIN discarded ON child.parent_session_id = discarded.id
      )
      DELETE FROM ${session} WHERE ${session.id} IN (SELECT id FROM discarded)
    `);
  }

  public projectSession(
    current: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    return this.sessionId === sessionId ? undefined : current;
  }

  public announcedChange(): WriterChange {
    return { sessionIds: [this.sessionId], turnIds: [] };
  }
}
