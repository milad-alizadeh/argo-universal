import type { Database } from '@repo/db';
import { run } from '@repo/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../storage';

export type RunRecord = typeof run.$inferSelect;

// Replaces the Run Configuration's earlier Run, so a Checkout keeps the latest Run of each, and its output file.
export class RunWriteJob implements WriterJob {
  public constructor(
    private readonly record: RunRecord,
    private readonly replaced?: readonly string[],
  ) {}
  public describe(): string {
    return `run ${this.record.id} ${this.record.status}`;
  }
  public commit(transaction: StorageTransaction): void {
    if (!this.replaced) {
      transaction
        .update(run)
        .set(this.record)
        .where(eq(run.id, this.record.id))
        .run();

      return;
    }

    for (const id of this.replaced)
      transaction.delete(run).where(eq(run.id, id)).run();
    transaction
      .insert(run)
      .values(this.record)
      .onConflictDoUpdate({ target: run.id, set: this.record })
      .run();
  }
}

export const latestRun = (
  database: Database,
  checkout: { projectId: string; checkoutPath: string },
  name: string,
): RunRecord | undefined =>
  database
    .select()
    .from(run)
    .where(
      and(
        eq(run.projectId, checkout.projectId),
        eq(run.checkoutPath, checkout.checkoutPath),
        eq(run.name, name),
      ),
    )
    .orderBy(desc(run.startedAt))
    .get();
