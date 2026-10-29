import { SessionRecord } from '@repo/contracts';
import { session } from '@repo/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { SQLiteUpdateSetSource } from 'drizzle-orm/sqlite-core';
import type { StorageTransaction, WriterJob } from '../../storage';
import { presentId } from './session-storage-common';

type SessionRowChange = {
  id: string;
  activityAt?: number;
  set: Partial<
    Omit<typeof session.$inferInsert, 'id' | 'projectId' | 'createdAt'>
  >;
};

export class SessionRowUpdateJob implements WriterJob {
  public constructor(private readonly change: SessionRowChange) {}

  public describe(): string {
    return `update Session ${this.change.id}: ${Object.keys(this.change.set).join(', ')}`;
  }

  public stamp(now: number): SessionRowUpdateJob {
    return this.change.set.maxRevision === undefined
      ? this
      : new SessionRowUpdateJob({
          ...this.change,
          activityAt: this.change.activityAt ?? now,
        });
  }

  public commit(transaction: StorageTransaction): void {
    const { id, set, activityAt } = this.change;
    const values: SQLiteUpdateSetSource<typeof session> = { ...set };

    if (set.maxRevision !== undefined)
      values.activityAt = sql`case when ${set.maxRevision} > ${session.maxRevision} then ${activityAt ?? Date.now()} else ${session.activityAt} end`;
    transaction.update(session).set(values).where(eq(session.id, id)).run();
  }

  public project(
    current: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    if (!current) return current;

    return this.projectUpdate(current, sessionId);
  }

  private projectUpdate(
    current: SessionRecord,
    sessionId: string,
  ): SessionRecord {
    if (this.change.id !== sessionId) return current;

    const { set } = this.change;

    const projected = { ...current, ...set };

    if (set.maxRevision !== undefined)
      projected.activityAt = this.revisionActivity(current, set.maxRevision);

    return SessionRecord.parse(projected);
  }

  public changedSessionIds(): string[] {
    return [this.change.id, ...presentId(this.change.set.parentSessionId)];
  }

  private revisionActivity(
    current: SessionRecord,
    maxRevision: number,
  ): number {
    return maxRevision > current.maxRevision
      ? (this.change.activityAt ?? current.activityAt)
      : current.activityAt;
  }
}
