import { sql } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../src/storage';

type SqlJobInput = {
  statement: string;
  refusable?: boolean;
  queuedAt?: number;
};

// A Writer job that runs one SQL statement, so storage tests need no module's jobs.
export class SqlJob implements WriterJob {
  public readonly refusable?: true;

  public constructor(private readonly input: SqlJobInput) {
    if (input.refusable) this.refusable = true;
  }

  public describe(): string {
    return this.input.statement;
  }

  public stamp(now: number): SqlJob {
    return new SqlJob({ ...this.input, queuedAt: this.input.queuedAt ?? now });
  }

  public commit(transaction: StorageTransaction): void {
    transaction.run(sql.raw(this.input.statement));
  }
}
