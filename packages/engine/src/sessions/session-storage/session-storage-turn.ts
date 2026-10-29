import { Turn } from '@repo/contracts';
import { turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../../storage';

type TurnChange = {
  id: string;
  set: Partial<Omit<typeof turn.$inferInsert, 'id' | 'sessionId'>>;
};

const turnDefaults = {
  startedAt: 0,
  endedAt: null,
  error: null,
  usage: null,
  stopReason: null,
  model: null,
};

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

  public turns(turns: ReadonlyMap<string, Turn>): ReadonlyMap<string, Turn> {
    const inserted = Turn.parse({ ...turnDefaults, ...this.insert.turn });

    return new Map(turns).set(inserted.id, inserted);
  }

  public changedSessionIds(): string[] {
    return [this.insert.turn.sessionId];
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

  // An undefined column is left as it is, as the commit leaves it.
  public turns(turns: ReadonlyMap<string, Turn>): ReadonlyMap<string, Turn> {
    const row = turns.get(this.change.id);

    if (!row) return turns;

    const set = Object.entries(this.change.set).filter(
      ([, value]): boolean => value !== undefined,
    );

    return new Map(turns).set(
      this.change.id,
      Turn.parse({ ...row, ...Object.fromEntries(set) }),
    );
  }

  public changedTurnIds(): string[] {
    return [this.change.id];
  }
}
