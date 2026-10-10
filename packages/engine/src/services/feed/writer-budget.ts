import type { WriterJob } from './writer-job';

type FeedRowsJob = Extract<WriterJob, { type: 'feedRows' }>;

// How much Feed row work the Writer holds queued before it refuses more; lifecycle jobs are never refused (ADR-0007).
export type FeedRowBudget = { jobs: number; bytes: number };

export const feedRowBudget: FeedRowBudget = {
  jobs: 256,
  bytes: 67_108_864,
};

// Roughly what a Feed row job holds in memory: its rows as JSON text and its whole tool output.
export const measureFeedRowsJob = (job: FeedRowsJob): number =>
  JSON.stringify(job.rows).length +
  (job.blobs ?? []).reduce((total, { data }): number => total + data.length, 0);

const spentOn = (queue: readonly WriterJob[]): FeedRowBudget =>
  queue.reduce(
    (spent, job): FeedRowBudget =>
      job.type === 'feedRows'
        ? { jobs: spent.jobs + 1, bytes: spent.bytes + (job.bytes ?? 0) }
        : spent,
    { jobs: 0, bytes: 0 },
  );

// A Feed row job arriving after the queued ones spent the budget is refused.
export const exceedsFeedRowBudget = (
  queue: readonly WriterJob[],
  budget: FeedRowBudget,
  job: WriterJob,
): boolean => {
  if (job.type !== 'feedRows') return false;
  const spent = spentOn(queue);
  return spent.jobs >= budget.jobs || spent.bytes >= budget.bytes;
};
