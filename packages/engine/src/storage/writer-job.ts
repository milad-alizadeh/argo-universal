import type { Database } from '@repo/db';
import { z } from 'zod';

export type StorageTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];

// One unit of work for the database Writer. The module that owns the job's tables defines it.
export interface WriterJob {
  // One line naming what the job writes, for the log of lost jobs.
  describe: () => string;
  commit: (transaction: StorageTransaction) => void;
  // Writes the files the job's rows name, before its rows commit (ADR-0005).
  writeFiles?: (blobsFolder: string | undefined) => Promise<void>;
  // Fills the times the job leaves to the Writer's clock, once, when it queues.
  stamp?: (now: number) => WriterJob;
  // Past the Writer's limit of waiting refusable jobs, it refuses more while other jobs still queue.
  readonly refusable?: true;
}

// Commits every job in order in one transaction; one failing job rolls back them all.
export function writeJobs(
  database: Database,
  jobs: readonly WriterJob[],
): void {
  database.transaction((transaction): void => {
    for (const job of jobs) job.commit(transaction);
  });
}

// A job the Writer left out of a batch, by its index in the batch.
export type DroppedWriterJob = { index: number; error: unknown };

export type WrittenWriterBatch = { dropped: DroppedWriterJob[] };

// SQLite's primary result code for a broken constraint; extended codes keep it in their low byte.
const sqliteConstraint = 19;

const primaryCodeRange = 256;

// A trigger's RAISE also reports a broken constraint, but it is the database refusing a write, which may pass.
const sqliteConstraintTrigger = 1811;

const SqliteFailure = z.object({ errcode: z.number() });

// The SQLite error naming the schema constraint a job broke, if it broke one. Retrying cannot commit that job, so it would hold up every job behind it.
function brokenConstraint(failure: Error): Error | undefined {
  for (
    let cause: unknown = failure;
    cause instanceof Error;
    cause = cause.cause
  ) {
    const sqlite = SqliteFailure.safeParse(cause);

    if (
      sqlite.success &&
      sqlite.data.errcode % primaryCodeRange === sqliteConstraint
    )
      return sqlite.data.errcode === sqliteConstraintTrigger
        ? undefined
        : cause;
  }

  return undefined;
}

// Commits a batch in one transaction, each job in its own savepoint. A job that breaks a constraint rolls back alone and is dropped; any other failure rolls back the whole batch.
export function writeWriterBatch(
  database: Database,
  jobs: readonly WriterJob[],
): WrittenWriterBatch {
  return database.transaction((transaction): WrittenWriterBatch => {
    const dropped: DroppedWriterJob[] = [];

    for (const [index, job] of jobs.entries()) {
      try {
        transaction.transaction((savepoint): void => job.commit(savepoint));
      } catch (error) {
        const constraint =
          error instanceof Error ? brokenConstraint(error) : undefined;

        if (!constraint) throw error;
        dropped.push({ index, error: constraint });
      }
    }

    return { dropped };
  });
}

export async function writeJobFiles(
  blobsFolder: string | undefined,
  jobs: readonly WriterJob[],
): Promise<void> {
  for (const job of jobs) await job.writeFiles?.(blobsFolder);
}

const describedJobLimit = 20;

// Names the first lost jobs and counts the rest, so the log stays bounded however long the queue grew.
export function describeLostJobs(jobs: readonly WriterJob[]): string {
  const named = jobs
    .slice(0, describedJobLimit)
    .map((job): string => job.describe());

  const rest = jobs.length - named.length;

  return [...named, ...(rest > 0 ? [`and ${rest} more`] : [])].join('\n');
}

// Queue time is shared by reads and writes, including retries of the same job.
export const stampWriterJob = (job: WriterJob, now: number): WriterJob =>
  job.stamp?.(now) ?? job;

// Keeps dependent writes in one queued job, even when the Writer starts a batch immediately.
export class AtomicWriterJob implements WriterJob {
  public constructor(private readonly jobs: readonly WriterJob[]) {}

  public unpack(): WriterJob[] {
    return unpackWriterJobs(this.jobs);
  }

  public get refusable(): true | undefined {
    return this.jobs.every((job) => job.refusable === true) ? true : undefined;
  }

  public describe(): string {
    return this.jobs.map((job) => job.describe()).join('; ');
  }

  public stamp(now: number): AtomicWriterJob {
    return new AtomicWriterJob(
      this.jobs.map((job) => stampWriterJob(job, now)),
    );
  }

  public async writeFiles(blobsFolder: string | undefined): Promise<void> {
    await writeJobFiles(blobsFolder, this.jobs);
  }

  public commit(transaction: StorageTransaction): void {
    for (const job of this.jobs) job.commit(transaction);
  }
}

// Readers and announcements expose the module-owned jobs inside an atomic write.
export const unpackWriterJobs = (jobs: readonly WriterJob[]): WriterJob[] =>
  jobs.flatMap((job) =>
    job instanceof AtomicWriterJob ? job.unpack() : [job],
  );
