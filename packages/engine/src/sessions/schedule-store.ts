import { SessionPromptInput } from '@repo/contracts';
import type { operations } from '@repo/contracts/operations';
import { sessionSchedule as table } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, isNotNull, isNull, lte, or } from 'drizzle-orm';
import type { z } from 'zod';
import type { WriterJob } from '../storage';
import { nextIntervalAt } from './schedule-timing';
import type { HandlerSources } from './session-sources';

type ScheduleRow = typeof table.$inferSelect;

type Definitions = typeof operations;

export type CreateSchedule = z.output<
  Definitions['session.schedulePrompt']['params']
>;

export type ManageSchedule = z.output<
  Definitions['session.manageSchedule']['params']
>;

export type Schedule = z.output<
  Definitions['session.schedulePrompt']['result']
>;

export type ScheduleOccurrence = {
  sessionId: string;
  prompt: Schedule['prompt'];
  deliveryWrite: WriterJob;
  coalescedWrite: WriterJob;
};

const second = 1000;

const oneDay = 86_400_000;

const lastDate = 8_640_000_000_000_000;

type ScheduleTiming = Pick<
  ScheduleRow,
  'intervalSeconds' | 'lastQueuedAt' | 'endsAt' | 'paused'
>;

const completed = (row: ScheduleTiming): boolean =>
  row.intervalSeconds === null && row.lastQueuedAt !== null;

const expired = (row: ScheduleTiming, now: number): boolean =>
  row.endsAt !== null && row.endsAt <= now;

function stateOf(row: ScheduleTiming, now: number): Schedule['state'] {
  if (completed(row)) return 'completed';

  if (expired(row, now)) return 'expired';

  return row.paused ? 'paused' : 'active';
}

const active = (): ReturnType<typeof and> =>
  and(
    eq(table.paused, false),
    or(isNotNull(table.intervalSeconds), isNull(table.lastQueuedAt)),
  );

const decodeSchedule = ({ prompt, ...row }: ScheduleRow): Schedule => ({
  ...row,
  state: stateOf(row, Date.now()),
  prompt: SessionPromptInput.shape.prompt.parse(JSON.parse(prompt)),
});

function occurrenceWrite(
  row: ScheduleRow,
  now: number,
  queued: boolean,
): WriterJob {
  const nextAt =
    row.intervalSeconds === null
      ? row.nextAt
      : nextIntervalAt(row.nextAt, row.intervalSeconds, now);

  const lastQueuedAt = queued ? now : row.lastQueuedAt;

  return {
    describe: () => 'Record scheduled Prompt',
    commit: (tx) => {
      tx.update(table)
        .set({ nextAt, lastQueuedAt })
        .where(eq(table.id, row.id))
        .run();
    },
  };
}

export class ScheduleStore {
  public constructor(
    private readonly sources: HandlerSources<'database' | 'createId', 'write'>,
  ) {}
  public active(): Pick<Schedule, 'id' | 'sessionId'>[] {
    return this.sources.database
      .select({ id: table.id, sessionId: table.sessionId })
      .from(table)
      .where(active())
      .all();
  }
  public deadline(id: string): number | undefined {
    const row = this.sources.database
      .select({ nextAt: table.nextAt, endsAt: table.endsAt })
      .from(table)
      .where(and(eq(table.id, id), active()))
      .get();

    if (!row || (row.endsAt !== null && row.endsAt <= Date.now()))
      return undefined;

    return Math.min(row.nextAt, row.endsAt ?? Infinity);
  }
  public occurrence(id: string): ScheduleOccurrence | undefined {
    const now = Date.now();

    const row = this.sources.database
      .select()
      .from(table)
      .where(and(eq(table.id, id), active(), lte(table.nextAt, now)))
      .get();

    if (!row || expired(row, now)) return undefined;

    return {
      sessionId: row.sessionId,
      prompt: decodeSchedule(row).prompt,
      deliveryWrite: occurrenceWrite(row, now, true),
      coalescedWrite: occurrenceWrite(row, now, false),
    };
  }
  public list(sessionId: string): Schedule[] {
    return this.sources.database
      .select()
      .from(table)
      .where(eq(table.sessionId, sessionId))
      .all()
      .map(decodeSchedule);
  }
  public async insert(input: CreateSchedule): Promise<Schedule> {
    const now = Date.now();
    const intervalSeconds = input.intervalSeconds ?? null;
    const nextAt = input.onceAt ?? now + (intervalSeconds ?? 0) * second;

    const endsAt =
      intervalSeconds === null ? null : (input.endsAt ?? now + oneDay);

    if (nextAt <= now || nextAt > lastDate)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Choose a future delivery time',
      });

    if (endsAt !== null && endsAt <= nextAt)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Choose an end time after the first occurrence',
      });

    const row: ScheduleRow = {
      id: this.sources.createId(),
      sessionId: input.sessionId,
      prompt: JSON.stringify(input.prompt),
      intervalSeconds,
      endsAt,
      nextAt,
      lastQueuedAt: null,
      paused: false,
    };

    await this.sources.open.write({
      describe: () => 'Create Schedule',
      commit: (tx) => tx.insert(table).values(row).run(),
    });

    return decodeSchedule(row);
  }
  public async change(input: ManageSchedule): Promise<void> {
    const { sessionId, id, action } = input;
    const target = and(eq(table.sessionId, sessionId), eq(table.id, id));
    const row = this.sources.database.select().from(table).where(target).get();

    if (!row)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });

    if (completed(row) && action !== 'delete') return;
    const update = this.update(row, input);
    await this.sources.open.write({
      describe: () => 'Manage Schedule',
      commit: (tx) => {
        if (action === 'delete') tx.delete(table).where(target).run();
        else tx.update(table).set(update).where(target).run();
      },
    });
  }
  private update(
    row: ScheduleRow,
    { action, endsAt }: ManageSchedule,
  ): Partial<ScheduleRow> {
    const now = Date.now();

    if (action === 'setEnd') return editEnd(row, endsAt, now);

    if (action === 'pause') return { paused: true };

    if (!row.paused || row.intervalSeconds === null) return { paused: false };

    return { paused: false, nextAt: now + row.intervalSeconds * second };
  }
}

function editEnd(
  row: ScheduleRow,
  endsAt: number | undefined,
  now: number,
): Partial<ScheduleRow> {
  if (row.intervalSeconds === null)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Only Interval follow-ups have an end time',
    });

  if (endsAt === undefined || endsAt <= now)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Choose a future end time',
    });

  const nextAt =
    expired(row, now) && row.nextAt <= now
      ? nextIntervalAt(row.nextAt, row.intervalSeconds, now)
      : row.nextAt;

  return nextAt === row.nextAt ? { endsAt } : { endsAt, nextAt };
}
