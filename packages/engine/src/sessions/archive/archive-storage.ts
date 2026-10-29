import type { SessionRecord } from '@repo/contracts';
import { session, turn } from '@repo/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { settleArchivedChild } from '../../feed';
import type { StorageTransaction, WriterJob } from '../../storage';

// One durable archive decision covers the parent and every borrowed Checkout.
export class SessionArchiveJob implements WriterJob {
  public constructor(
    private readonly ids: string[],
    private readonly archivedAt: number | null,
  ) {}

  public describe(): string {
    return `archive Sessions ${this.ids.join(', ')}`;
  }

  public commit(transaction: StorageTransaction): void {
    transaction
      .update(session)
      .set({ archivedAt: this.archivedAt })
      .where(inArray(session.id, this.ids))
      .run();

    if (this.archivedAt !== null) this.cancelChildTurns(transaction);
  }

  private cancelChildTurns(transaction: StorageTransaction): void {
    const children = this.ids.slice(1);

    if (!children.length) return;

    for (const child of children) settleArchivedChild(transaction, child);

    transaction
      .update(turn)
      .set({
        status: 'ended',
        stopReason: 'cancelled',
        endedAt: this.archivedAt,
      })
      .where(and(inArray(turn.sessionId, children), eq(turn.status, 'running')))
      .run();
  }

  public session(
    current: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    return current && this.ids.includes(sessionId)
      ? { ...current, archivedAt: this.archivedAt }
      : current;
  }

  public changedSessionIds(): string[] {
    return this.ids;
  }
}
