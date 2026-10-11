import { SessionRecord, Turn } from '@repo/contracts';
import { project, session, turn } from '@repo/db/schema';
import { eq, sql } from 'drizzle-orm';
import { projectQueuedFeedSession, queuedFeedSessionId } from '../feed';
import {
  readQueuedJobs,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';

type SessionInsert = {
  session: typeof session.$inferInsert;
  checkoutChoice: NonNullable<typeof project.$inferInsert.checkoutChoice>;
};
type SessionRowChange = {
  id: string;
  activityAt?: number;
  set: Partial<
    Omit<typeof session.$inferInsert, 'id' | 'projectId' | 'createdAt'>
  >;
};
type TurnChange = {
  id: string;
  set: Partial<Omit<typeof turn.$inferInsert, 'id' | 'sessionId'>>;
};

const sessionDefaults = {
  title: '',
  titleSource: 'prompt',
  archivedAt: null,
  seenRevision: 0,
  activityAt: 0,
  failure: null,
  vendorSessionId: null,
  parentSessionId: null,
  checkoutBranch: null,
  vendorRef: null,
  configValues: [],
  epoch: 0,
  maxRevision: 0,
  createdAt: 0,
  updatedAt: 0,
};
const turnDefaults = {
  startedAt: 0,
  endedAt: null,
  error: null,
  usage: null,
  stopReason: null,
  model: null,
};
const presentId = (id: string | null | undefined): string[] => (id ? [id] : []);

// Stores a new Session; borrows its Project's `checkout_choice` so the chosen checkout is remembered in the same commit.
export class SessionInsertJob implements WriterJob {
  public constructor(private readonly insert: SessionInsert) {}

  public describe(): string {
    return `insert Session ${this.insert.session.id} of Project ${this.insert.session.projectId}`;
  }

  public stamp(now: number): SessionInsertJob {
    const stored = this.insert.session;
    return new SessionInsertJob({
      ...this.insert,
      session: {
        ...stored,
        createdAt: stored.createdAt ?? now,
        updatedAt: stored.updatedAt ?? now,
      },
    });
  }

  public commit(transaction: StorageTransaction): void {
    transaction.insert(session).values(this.insert.session).run();
    transaction
      .update(project)
      .set({ checkoutChoice: this.insert.checkoutChoice })
      .where(eq(project.id, this.insert.session.projectId))
      .run();
  }

  public project(
    current: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    return this.insert.session.id === sessionId
      ? SessionRecord.parse({ ...sessionDefaults, ...this.insert.session })
      : current;
  }

  public changedSessionIds(): string[] {
    const stored = this.insert.session;
    return [stored.id, ...presentId(stored.parentSessionId)];
  }

  // The Session, when it or its parent is in scope; every queued Session without a scope.
  public sessionIdIn(scope: readonly string[] | undefined): string[] {
    const stored = this.insert.session;
    const inScope =
      !scope ||
      scope.includes(stored.id) ||
      presentId(stored.parentSessionId).some((id) => scope.includes(id));
    return inScope ? [stored.id] : [];
  }
}

export class SessionRowUpdateJob implements WriterJob {
  public constructor(private readonly change: SessionRowChange) {}

  public describe(): string {
    return `update Session ${this.change.id}: ${Object.keys(this.change.set).join(', ')}`;
  }

  public stamp(now: number): SessionRowUpdateJob {
    return this.change.set.maxRevision === undefined
      ? this
      : new SessionRowUpdateJob({
          ...this.change,
          activityAt: this.change.activityAt ?? now,
        });
  }

  public commit(transaction: StorageTransaction): void {
    const { id, set, activityAt } = this.change;
    transaction
      .update(session)
      .set({
        ...set,
        ...(set.maxRevision === undefined
          ? {}
          : {
              activityAt: sql`case when ${set.maxRevision} > ${session.maxRevision} then ${activityAt ?? Date.now()} else ${session.activityAt} end`,
            }),
      })
      .where(eq(session.id, id))
      .run();
  }

  public project(
    current: SessionRecord | undefined,
    sessionId: string,
  ): SessionRecord | undefined {
    if (!current || this.change.id !== sessionId) return current;
    const { set } = this.change;
    return SessionRecord.parse({
      ...current,
      ...set,
      ...(set.maxRevision === undefined
        ? {}
        : { activityAt: this.revisionActivity(current, set.maxRevision) }),
    });
  }

  public changedSessionIds(): string[] {
    return [this.change.id, ...presentId(this.change.set.parentSessionId)];
  }

  private revisionActivity(
    current: SessionRecord,
    maxRevision: number,
  ): number {
    return maxRevision > current.maxRevision
      ? (this.change.activityAt ?? current.activityAt)
      : current.activityAt;
  }
}

export class TurnInsertJob implements WriterJob {
  public constructor(
    private readonly insert: { turn: typeof turn.$inferInsert },
  ) {}

  public describe(): string {
    return `insert Turn ${this.insert.turn.id} of Session ${this.insert.turn.sessionId}`;
  }

  public stamp(now: number): TurnInsertJob {
    const { turn: inserted } = this.insert;
    return new TurnInsertJob({
      turn: { ...inserted, startedAt: inserted.startedAt ?? now },
    });
  }

  public commit(transaction: StorageTransaction): void {
    transaction.insert(turn).values(this.insert.turn).run();
  }

  public project(turns: Map<string, Turn>): void {
    turns.set(
      this.insert.turn.id,
      Turn.parse({ ...turnDefaults, ...this.insert.turn }),
    );
  }

  public changedSessionIds(): string[] {
    return [this.insert.turn.sessionId];
  }

  public sessionIdOf(turnId: string): string | undefined {
    return this.insert.turn.id === turnId
      ? this.insert.turn.sessionId
      : undefined;
  }
}

export class TurnUpdateJob implements WriterJob {
  public constructor(private readonly change: TurnChange) {}

  public describe(): string {
    return `update Turn ${this.change.id}: ${Object.keys(this.change.set).join(', ')}`;
  }

  public commit(transaction: StorageTransaction): void {
    transaction
      .update(turn)
      .set(this.change.set)
      .where(eq(turn.id, this.change.id))
      .run();
  }

  public project(turns: Map<string, Turn>): void {
    const row = turns.get(this.change.id);
    if (row)
      turns.set(this.change.id, Turn.parse({ ...row, ...this.change.set }));
  }

  public turnId(): string {
    return this.change.id;
  }
}

const projectSessionJob = (
  current: SessionRecord | undefined,
  job: WriterJob,
  sessionId: string,
): SessionRecord | undefined => {
  if (job instanceof SessionInsertJob || job instanceof SessionRowUpdateJob)
    return job.project(current, sessionId);
  return current?.id === sessionId
    ? projectQueuedFeedSession(job, current)
    : current;
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
    for (const job of this.jobs)
      if (job instanceof TurnInsertJob || job instanceof TurnUpdateJob)
        job.project(turns);
    return [...turns.values()];
  }

  public changedTurnIds(): string[] {
    return changedTurnIds(this.jobs);
  }

  public turnSessionId(turnId: string): string | undefined {
    for (const job of this.jobs)
      if (job instanceof TurnInsertJob && job.sessionIdOf(turnId))
        return job.sessionIdOf(turnId);
    return undefined;
  }
}

export type { QueuedSessionRows };

export const readQueuedSessionRows = (
  writer: WriterActorRef | undefined,
): QueuedSessionRows => new QueuedSessionRows(readQueuedJobs(writer));

export const changedSessionIds = (job: WriterJob): string[] => {
  if (
    job instanceof SessionInsertJob ||
    job instanceof SessionRowUpdateJob ||
    job instanceof TurnInsertJob
  )
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
