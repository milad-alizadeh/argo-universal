import type { SessionRecord, Turn } from '@repo/contracts';
import {
  readQueuedJobs,
  type WriterActorRef,
  type WriterJob,
} from '../../storage';

const projectSession = (
  current: SessionRecord | undefined,
  job: WriterJob,
  sessionId: string,
): SessionRecord | undefined =>
  job.session ? job.session(current, sessionId) : current;

const unique = (ids: string[]): string[] => [...new Set(ids)];

// The Sessions and Turns the Writer holds but has not committed, each job read through its own projection.
class QueuedSessionRows {
  public constructor(private readonly jobs: readonly WriterJob[]) {}

  public session(
    row: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    return this.jobs.reduce<SessionRecord | undefined>(
      (current, job) => projectSession(current, job, sessionId),
      row,
    );
  }

  public sessionIds(scope?: readonly string[]): string[] {
    return unique(
      this.jobs.flatMap((job) => job.insertedSessionIds?.(scope) ?? []),
    );
  }

  public turns(rows: readonly Turn[]): Turn[] {
    const turns = this.jobs.reduce<ReadonlyMap<string, Turn>>(
      (current, job) => job.turns?.(current) ?? current,
      new Map(rows.map((row): [string, Turn] => [row.id, row])),
    );

    return [...turns.values()];
  }

  public changedTurnIds(): string[] {
    return unique(this.jobs.flatMap((job) => job.changedTurnIds?.() ?? []));
  }

  // The Session of a Turn a queued job inserts.
  public turnSessionId(turnId: string): string | undefined {
    return this.turns([]).find((queued) => queued.id === turnId)?.sessionId;
  }
}

export type { QueuedSessionRows };

export const readQueuedSessionRows = (
  writer: WriterActorRef | undefined,
): QueuedSessionRows => new QueuedSessionRows(readQueuedJobs(writer));
