import type { SessionUpdate } from '@repo/contracts';
import {
  type QueuedFeedRows,
  readQueuedJobs,
  type WriterActorRef,
  type WriterJob,
} from '../storage';
import { newestRows } from './feed-row';
import { turnEndingsOf, type CommittedTurnEnding } from './turn-settlement';

const feedRowsOf = (jobs: readonly WriterJob[]): QueuedFeedRows[] =>
  jobs.flatMap((job) => job.feedRows?.() ?? []);

// The live Turn endings in a Writer commit. Only queued Feed rows carry one: stored settlement (Engine restart, archive) writes in its own transaction, so its endings never appear here.
export const committedTurnEndings = (
  jobs: readonly WriterJob[],
): readonly CommittedTurnEnding[] =>
  feedRowsOf(jobs).flatMap(({ sessionId, rows }) =>
    turnEndingsOf(sessionId, rows),
  );

export type QueuedFeed = {
  rows: SessionUpdate[];
  maxRevision: number;
  highestPosition: number;
};

// The Feed rows of one Session the Writer holds but has not committed, newest revision of each.
export const readQueuedFeed = (
  writer: WriterActorRef | undefined,
  sessionId: string,
): QueuedFeed => {
  const batches = feedRowsOf(readQueuedJobs(writer)).filter(
    (batch) => batch.sessionId === sessionId,
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
