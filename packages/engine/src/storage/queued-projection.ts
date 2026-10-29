import type { SessionRecord, SessionUpdate, Turn } from '@repo/contracts';

// One Session's Feed rows a job writes, and the revision it advances that Session to.
export type QueuedFeedRows = {
  sessionId: string;
  rows: SessionUpdate[];
  maxRevision: number;
};

/*
 * What reads see of a job while the Writer holds it, and which rows it announces when it queues and commits.
 * Each job says this for the rows it writes, exactly as its commit leaves them, and leaves out the rest; reads
 * fold every queued job, oldest first, without knowing which module queued it.
 */
export interface QueuedProjection {
  // The Session row as the job leaves it; undefined when the job removes it.
  session?: (
    current: SessionRecord | undefined,
    sessionId: string,
  ) => SessionRecord | undefined;
  // The Sessions the job inserts that are in scope, or all it inserts without a scope.
  insertedSessionIds?: (scope: readonly string[] | undefined) => string[];
  // The Turns, by id, as the job leaves them.
  turns?: (turns: ReadonlyMap<string, Turn>) => ReadonlyMap<string, Turn>;
  feedRows?: () => QueuedFeedRows;
  // The Sessions whose row, Turns, Feed or Shells the job changes.
  changedSessionIds?: () => string[];
  // The stored Turns the job updates.
  changedTurnIds?: () => string[];
}
