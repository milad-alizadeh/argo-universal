import { SessionRecord } from '@repo/contracts';
import { project, session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../../storage';
import { insertParents } from './session-storage-common';

type SessionInsert = {
  session: typeof session.$inferInsert;
  checkoutChoice?: NonNullable<typeof project.$inferInsert.checkoutChoice>;
};

const sessionDefaults = {
  title: '',
  titleSource: 'prompt',
  archivedAt: null,
  seenRevision: 0,
  activityAt: 0,
  failure: null,
  vendorSessionId: null,
  parentSessionId: null,
  startedBySessionId: null,
  checkoutBranch: null,
  vendorRef: null,
  configValues: [],
  heldConfig: [],
  epoch: 0,
  maxRevision: 0,
  createdAt: 0,
  updatedAt: 0,
};

const isInScope = (
  stored: typeof session.$inferInsert,
  scope: readonly string[],
): boolean =>
  scope.includes(stored.id) ||
  insertParents(stored).some((id) => scope.includes(id));

// Stores a new Session; borrows its Project's `checkout_choice` so the chosen checkout is remembered in the same commit.
export class SessionInsertJob implements WriterJob {
  public constructor(private readonly insert: SessionInsert) {}

  public describe(): string {
    return `insert Session ${this.insert.session.id} of Project ${this.insert.session.projectId}`;
  }

  public stamp(now: number): SessionInsertJob {
    const stored = this.insert.session;

    return new SessionInsertJob({
      ...this.insert,
      session: {
        ...stored,
        createdAt: stored.createdAt ?? now,
        updatedAt: stored.updatedAt ?? now,
      },
    });
  }

  public commit(transaction: StorageTransaction): void {
    transaction.insert(session).values(this.insert.session).run();

    if (this.insert.checkoutChoice)
      transaction
        .update(project)
        .set({ checkoutChoice: this.insert.checkoutChoice })
        .where(eq(project.id, this.insert.session.projectId))
        .run();
  }

  public session(
    current: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    return this.insert.session.id === sessionId
      ? SessionRecord.parse({ ...sessionDefaults, ...this.insert.session })
      : current;
  }

  public changedSessionIds(): string[] {
    const stored = this.insert.session;

    return [stored.id, ...insertParents(stored)];
  }

  // The Session, when it or its parent is in scope; every queued Session without a scope.
  public insertedSessionIds(scope: readonly string[] | undefined): string[] {
    const stored = this.insert.session;

    if (!scope) return [stored.id];

    return isInScope(stored, scope) ? [stored.id] : [];
  }
}
