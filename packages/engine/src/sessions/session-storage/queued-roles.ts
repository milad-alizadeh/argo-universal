import type { SessionRecord, Turn } from '@repo/contracts';
import type { WriterJob } from '../../storage';

/*
 * The roles a Writer job takes in Session and Turn reads while it waits in the Writer's queue. A job of any
 * module takes a role by having its member, and reads find the role by that shape, never by the job's class.
 */

// Changes Session rows: the row as the job's commit leaves it, undefined once the job removes it.
export interface QueuedSessionChange {
  projectSession: (
    current: SessionRecord | undefined,
    sessionId: string,
  ) => SessionRecord | undefined;
}

// Inserts Sessions: those in scope, or every one it inserts without a scope.
export interface QueuedSessionInsert {
  insertedSessionIds: (scope: readonly string[] | undefined) => string[];
}

// Changes one Turn: that Turn as the job's commit leaves it, undefined when the job leaves none.
export interface QueuedTurnChange {
  projectTurn: (turns: ReadonlyMap<string, Turn>) => Turn | undefined;
}

// Inserts a Turn: its Session, when the job inserts this Turn.
export interface QueuedTurnInsert {
  insertedTurnSessionId: (turnId: string) => string | undefined;
}

export const changesSession = (
  job: WriterJob,
): job is WriterJob & QueuedSessionChange => 'projectSession' in job;

export const insertsSessions = (
  job: WriterJob,
): job is WriterJob & QueuedSessionInsert => 'insertedSessionIds' in job;

export const changesTurn = (
  job: WriterJob,
): job is WriterJob & QueuedTurnChange => 'projectTurn' in job;

export const insertsTurn = (
  job: WriterJob,
): job is WriterJob & QueuedTurnInsert => 'insertedTurnSessionId' in job;
