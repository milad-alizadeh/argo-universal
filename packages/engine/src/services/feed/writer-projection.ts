import { Turn, type SessionRecord, type SessionUpdate } from '@repo/contracts';
import type { ActorRefFrom } from 'xstate';
import { newestRows } from './feed-row';
import type { WriterJob } from './writer-job';
import type { writerMachine } from './writer-machine';
import { pendingSessionIds, projectSession } from './writer-session-projection';

type PendingFeed = {
  rows: SessionUpdate[];
  maxRevision: number;
  highestPosition: number;
};

class PendingWriterProjection {
  public constructor(private readonly jobs: readonly WriterJob[]) {}

  public session(
    row: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    return projectSession(row, sessionId, this.jobs);
  }

  public sessionIds(scope?: readonly string[]): string[] {
    return pendingSessionIds(this.jobs, scope);
  }

  public turns(rows: readonly Turn[]): Turn[] {
    return projectTurns(rows, this.jobs);
  }

  public changedTurnIds(): string[] {
    return [
      ...new Set(
        this.jobs.flatMap((job): string[] =>
          job.type === 'turnUpdate' ? [job.id] : [],
        ),
      ),
    ];
  }

  public turnSessionId(turnId: string): string | undefined {
    const inserted = this.jobs.find(
      (job) => job.type === 'turnInsert' && job.turn.id === turnId,
    );
    return inserted?.type === 'turnInsert'
      ? inserted.turn.sessionId
      : undefined;
  }

  public feedRow(sessionId: string, id: string): SessionUpdate | undefined {
    return this.feed(sessionId).rows.find((row) => row.id === id);
  }

  public feed(sessionId: string): PendingFeed {
    const batches = this.jobs.filter(
      (job): job is Extract<WriterJob, { type: 'feedRows' }> =>
        job.type === 'feedRows' && job.sessionId === sessionId,
    );
    const rows = batches.flatMap((job) => job.rows);
    return {
      rows: [...newestRows(rows).values()],
      maxRevision: Math.max(0, ...batches.map((job) => job.maxRevision)),
      highestPosition: Math.max(-1, ...rows.map((row) => row.position)),
    };
  }
}

export const readWriterProjection = (
  writer: ActorRefFrom<typeof writerMachine> | undefined,
): WriterProjection =>
  new PendingWriterProjection(writer?.getSnapshot().context.queue ?? []);

export type WriterProjection = PendingWriterProjection;

type TurnJob = Extract<WriterJob, { type: 'turnInsert' | 'turnUpdate' }>;

const turnDefaults = {
  startedAt: 0,
  endedAt: null,
  error: null,
  usage: null,
  stopReason: null,
  model: null,
};

const insertedTurn = (job: Extract<TurnJob, { type: 'turnInsert' }>): Turn =>
  Turn.parse({ ...turnDefaults, ...job.turn });

const applyTurnJob = (turns: Map<string, Turn>, job: TurnJob): void => {
  if (job.type === 'turnInsert') {
    turns.set(job.turn.id, insertedTurn(job));
    return;
  }
  const row = turns.get(job.id);
  if (row) turns.set(job.id, Turn.parse({ ...row, ...job.set }));
};

const isTurnJob = (job: WriterJob): job is TurnJob =>
  job.type === 'turnInsert' || job.type === 'turnUpdate';

const projectTurns = (
  rows: readonly Turn[],
  jobs: readonly WriterJob[],
): Turn[] => {
  const turns = new Map(rows.map((row): [string, Turn] => [row.id, row]));
  for (const job of jobs.filter(isTurnJob)) applyTurnJob(turns, job);
  return [...turns.values()];
};
