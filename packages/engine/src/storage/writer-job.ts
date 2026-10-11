import type { Database } from '@repo/db';

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
