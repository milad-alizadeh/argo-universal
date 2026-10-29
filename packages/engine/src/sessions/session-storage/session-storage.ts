import type { SessionRecord, Turn } from '@repo/contracts';
import type { Database } from '@repo/db';
import { projectQueuedFeedSession, queuedFeedSessionId } from '../../feed';
import {
  readQueuedJobs,
  type WriterActorRef,
  type WriterJob,
} from '../../storage';
import { SessionArchiveJob } from '../archive/archive-storage';
import { SessionSeenJob } from '../session-seen';
import { ShellWriteJob } from '../shells/storage';
import { presentId } from './session-storage-common';
import { SessionInsertJob } from './session-storage-insert';
import {
  projectedLatestTurn,
  storedLatestTurns,
} from './session-storage-latest';
import { SessionDeleteJob, SessionTitleJob } from './session-storage-title';
import { TurnInsertJob, TurnUpdateJob } from './session-storage-turn';
import { SessionRowUpdateJob } from './session-storage-update';

export { SessionInsertJob } from './session-storage-insert';

export { SessionDeleteJob, SessionTitleJob } from './session-storage-title';

export { TurnInsertJob, TurnUpdateJob } from './session-storage-turn';

export { SessionRowUpdateJob } from './session-storage-update';

type SessionProjectJob =
  | SessionInsertJob
  | SessionRowUpdateJob
  | SessionTitleJob
  | SessionDeleteJob
  | SessionArchiveJob
  | SessionSeenJob;

const isSessionUpdate = (
  job: WriterJob,
): job is SessionInsertJob | SessionRowUpdateJob | SessionTitleJob =>
  job instanceof SessionInsertJob ||
  job instanceof SessionRowUpdateJob ||
  job instanceof SessionTitleJob;

const isSessionRemoval = (
  job: WriterJob,
): job is SessionDeleteJob | SessionArchiveJob | SessionSeenJob =>
  job instanceof SessionDeleteJob ||
  job instanceof SessionArchiveJob ||
  job instanceof SessionSeenJob;

const isSessionProjectJob = (job: WriterJob): job is SessionProjectJob =>
  isSessionUpdate(job) || isSessionRemoval(job);

const isTurnJob = (job: WriterJob): job is TurnInsertJob | TurnUpdateJob =>
  job instanceof TurnInsertJob || job instanceof TurnUpdateJob;

const isOtherIndexedJob = (
  job: WriterJob,
): job is ShellWriteJob | TurnInsertJob =>
  job instanceof ShellWriteJob || job instanceof TurnInsertJob;

const projectFeedJob = (
  current: SessionRecord | undefined,
  job: WriterJob,
  sessionId: string,
): SessionRecord | undefined =>
  current?.id === sessionId ? projectQueuedFeedSession(job, current) : current;

const projectSessionJob = (
  current: SessionRecord | undefined,
  job: WriterJob,
  sessionId: string,
): SessionRecord | undefined => {
  if (isSessionProjectJob(job)) return job.project(current, sessionId);

  return projectFeedJob(current, job, sessionId);
};

// The Sessions, Turns and their Feed row advances the Writer holds but has not committed.
class QueuedSessionRows {
  public constructor(private readonly jobs: readonly WriterJob[]) {}

  public session(
    row: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    return this.jobs.reduce<SessionRecord | undefined>(
      (current, job) => projectSessionJob(current, job, sessionId),
      row,
    );
  }

  public sessionIds(scope?: readonly string[]): string[] {
    return [
      ...new Set(
        this.jobs.flatMap((job): string[] =>
          job instanceof SessionInsertJob ? job.sessionIdIn(scope) : [],
        ),
      ),
    ];
  }

  public turns(rows: readonly Turn[]): Turn[] {
    const turns = new Map(rows.map((row): [string, Turn] => [row.id, row]));

    for (const job of this.jobs) if (isTurnJob(job)) job.project(turns);

    return [...turns.values()];
  }

  public changedTurnIds(): string[] {
    return changedTurnIds(this.jobs);
  }

  public turnSessionId(turnId: string): string | undefined {
    return this.jobs
      .find(
        (job): job is TurnInsertJob =>
          job instanceof TurnInsertJob && Boolean(job.sessionIdOf(turnId)),
      )
      ?.sessionIdOf(turnId);
  }
}

export type { QueuedSessionRows };

export const readQueuedSessionRows = (
  writer: WriterActorRef | undefined,
): QueuedSessionRows => new QueuedSessionRows(readQueuedJobs(writer));

// Where a read finds rows: committed in the database, or queued in the Writer.
export type RowSources = {
  database: Database;
  writer: WriterActorRef | undefined;
};

// A Session's latest Turn as the Writer will leave it: the stored latest Turn with the queued Turn jobs replayed over it.
export const readLatestTurn = (
  sources: RowSources,
  sessionId: string,
): Turn | undefined => readLatestTurns(sources, [sessionId])(sessionId);

// The latest Turn of each of these Sessions, read in one query; a malformed stored Turn throws only when its Session is asked for.
export function readLatestTurns(
  { database, writer }: RowSources,
  sessionIds: string[],
): (sessionId: string) => Turn | undefined {
  const stored = storedLatestTurns(database, sessionIds);
  const queued = readQueuedSessionRows(writer);

  return (sessionId): Turn | undefined =>
    projectedLatestTurn(stored, queued, sessionId);
}

export const changedSessionIds = (job: WriterJob): string[] => {
  if (isSessionProjectJob(job) || isOtherIndexedJob(job))
    return job.changedSessionIds();

  return presentId(queuedFeedSessionId(job));
};

export const changedTurnIds = (jobs: readonly WriterJob[]): string[] => [
  ...new Set(
    jobs.flatMap((job): string[] =>
      job instanceof TurnUpdateJob ? [job.turnId()] : [],
    ),
  ),
];
