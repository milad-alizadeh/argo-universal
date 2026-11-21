import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';
import { appendStoredNotice } from '../../feed';
import {
  writeDatabaseJobAndWaitForCommit,
  writeJobs,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../../storage';
import type { AnnouncedJob, WriterChange } from '../writer-changes';

type Retention = { sessionId: string; reason: string; retry?: true };

class CheckoutRetentionJob implements WriterJob, AnnouncedJob {
  public constructor(private readonly retention: Retention) {}

  public describe(): string {
    return `Keep the Checkout for archived Session ${this.retention.sessionId}`;
  }

  public commit(transaction: StorageTransaction): void {
    const { sessionId, reason, retry } = this.retention;

    const archived = readArchived(transaction, sessionId);

    if (!archived) return;

    if (!retry) markKept(transaction, sessionId);

    appendStoredNotice(transaction, sessionId, {
      id: `${sessionId}:archive-checkout-kept`,
      severity: 'warning',
      title: 'Checkout kept',
      description: reason,
    });
  }

  public announcedChange(): WriterChange {
    return { sessionIds: [this.retention.sessionId], turnIds: [] };
  }
}

export async function keepArchivedCheckout(
  database: Database,
  retention: Retention,
  writer?: WriterActorRef,
): Promise<void> {
  const job = new CheckoutRetentionJob(retention);

  if (writer) await writeDatabaseJobAndWaitForCommit(writer, job, true);
  else writeJobs(database, [job]);
}

const readArchived = (
  transaction: StorageTransaction,
  id: string,
): { archivedAt: number | null } | undefined =>
  transaction
    .select({ archivedAt: session.archivedAt })
    .from(session)
    .where(and(eq(session.id, id), isNotNull(session.archivedAt)))
    .get();

const markKept = (transaction: StorageTransaction, id: string): void => {
  transaction
    .update(session)
    .set({ keepCheckout: true })
    .where(eq(session.id, id))
    .run();
};
