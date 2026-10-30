import type { SessionRecord, Turn } from '@repo/contracts';
import {
  readQueuedJobs,
  type WriterActorRef,
  type WriterJob,
} from '../../storage';
import { writerChangeOf } from '../writer-changes';
import {
  changesSession,
  changesTurn,
  insertsSessions,
  insertsTurn,
} from './queued-roles';

// The Sessions and Turns the Writer holds but has not committed, each job read through the roles it takes.
class QueuedSessionRows {
  public constructor(private readonly jobs: readonly WriterJob[]) {}

  public session(
    row: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    return this.jobs
      .filter(changesSession)
      .reduce<SessionRecord | undefined>(
        (current, job) => job.projectSession(current, sessionId),
        row,
      );
  }

  public sessionIds(scope?: readonly string[]): string[] {
    const inserted = this.jobs
      .filter(insertsSessions)
      .flatMap((job) => job.insertedSessionIds(scope));

    return [...new Set(inserted)];
  }

  public turns(rows: readonly Turn[]): Turn[] {
    const turns = new Map(rows.map((row): [string, Turn] => [row.id, row]));

    for (const job of this.jobs.filter(changesTurn)) {
      const projected = job.projectTurn(turns);

      if (projected) turns.set(projected.id, projected);
    }

    return [...turns.values()];
  }

  public changedTurnIds(): string[] {
    return writerChangeOf(this.jobs).turnIds;
  }

  // The Session of a Turn a queued job inserts.
  public turnSessionId(turnId: string): string | undefined {
    for (const job of this.jobs.filter(insertsTurn)) {
      const sessionId = job.insertedTurnSessionId(turnId);

      if (sessionId) return sessionId;
    }

    return undefined;
  }
}

export type { QueuedSessionRows };

export const readQueuedSessionRows = (
  writer: WriterActorRef | undefined,
): QueuedSessionRows => new QueuedSessionRows(readQueuedJobs(writer));
