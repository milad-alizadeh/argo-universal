import type { SessionRecord, SessionUpdate } from '@repo/contracts';
import {
  readQueuedJobs,
  type WriterActorRef,
  type WriterJob,
} from '../storage';
import { newestRows } from './feed-row';
import { FeedRowsJob, type QueuedFeedRows } from './feed-rows-job';

export { FeedRowsJob } from './feed-rows-job';

function queuedRows(job: WriterJob, sessionId: string): QueuedFeedRows[] {
  const queued =
    job instanceof FeedRowsJob ? job.queuedRows(sessionId) : undefined;

  return queued ? [queued] : [];
}

export type QueuedFeed = QueuedFeedRows & { highestPosition: number };

// The Feed rows of one Session the Writer holds but has not committed, newest revision of each.
export const readQueuedFeed = (
  writer: WriterActorRef | undefined,
  sessionId: string,
): QueuedFeed => {
  const batches = readQueuedJobs(writer).flatMap((job) =>
    queuedRows(job, sessionId),
  );

  const rows = batches.flatMap((batch): SessionUpdate[] => batch.rows);

  return {
    rows: [...newestRows(rows).values()],
    maxRevision: Math.max(0, ...batches.map((batch) => batch.maxRevision)),
    highestPosition: Math.max(-1, ...rows.map((row) => row.position)),
  };
};

export const readQueuedFeedRow = (
  writer: WriterActorRef | undefined,
  { sessionId, id }: { sessionId: string; id: string },
): SessionUpdate | undefined =>
  readQueuedFeed(writer, sessionId).rows.find((row) => row.id === id);

// A Session row as a queued job leaves it, when the job is a Feed row job of that Session.
export const projectQueuedFeedSession = (
  job: WriterJob,
  current: SessionRecord,
): SessionRecord =>
  job instanceof FeedRowsJob && job.sessionId === current.id
    ? job.projectSession(current)
    : current;

// The Session whose row a queued Feed row job changes.
export const queuedFeedSessionId = (job: WriterJob): string | undefined =>
  job instanceof FeedRowsJob ? job.sessionId : undefined;
