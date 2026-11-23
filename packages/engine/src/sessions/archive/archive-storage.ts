import type { SessionRecord } from '@repo/contracts';
import { session, sessionSchedule, turn } from '@repo/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { settleArchivedChild } from '../../feed';
import type { StorageTransaction, WriterJob } from '../../storage';
import { revokeDelegations } from '../orchestration/result-store';
import type { QueuedSessionChange } from '../session-storage';
import type { AnnouncedJob, WriterChange } from '../writer-changes';

// One durable archive decision covers the parent and every borrowed Checkout.
export class SessionArchiveJob
  implements WriterJob, QueuedSessionChange, AnnouncedJob
{
  public constructor(
    private readonly ids: string[],
    private readonly archivedAt: number | null,
    private readonly keepCheckout: boolean,
  ) {}

  public describe(): string {
    return `archive Sessions ${this.ids.join(', ')}`;
  }

  public commit(transaction: StorageTransaction): void {
    transaction
      .update(session)
      .set({ archivedAt: this.archivedAt, keepCheckout: this.keepCheckout })
      .where(inArray(session.id, this.ids))
      .run();

    if (this.archivedAt !== null) {
      revokeDelegations(transaction, this.ids);
      // An archived Session's Schedules pause; unarchiving leaves resuming to the person (ADR-0067).
      transaction
        .update(sessionSchedule)
        .set({ paused: true })
        .where(inArray(sessionSchedule.sessionId, this.ids))
        .run();
      this.cancelChildTurns(transaction);
    }
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

  public projectSession(
    current: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    return current && this.ids.includes(sessionId)
      ? {
          ...current,
          archivedAt: this.archivedAt,
          keepCheckout: this.keepCheckout,
        }
      : current;
  }

  public announcedChange(): WriterChange {
    return { sessionIds: this.ids, turnIds: [] };
  }
}
