import { SessionPromptInput } from '@repo/contracts';
import type { operations } from '@repo/contracts/operations';
import { sessionSchedule as table } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, lte } from 'drizzle-orm';
import type { z } from 'zod';
import type { WriterJob } from '../storage';
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
  prompt: Schedule['prompt'];
  commitWith: WriterJob;
};

const second = 1000;

const decodeSchedule = ({ prompt, ...row }: ScheduleRow): Schedule => ({
  ...row,
  prompt: SessionPromptInput.shape.prompt.parse(JSON.parse(prompt)),
});

function deliveryWrite(row: ScheduleRow, now: number): WriterJob {
  const period = row.intervalSeconds * second;

  const nextAt =
    row.nextAt + (Math.floor((now - row.nextAt) / period) + 1) * period;

  return {
    describe: () => 'Record scheduled Prompt',
    commit: (tx) => {
      tx.update(table)
        .set({ nextAt, lastQueuedAt: now })
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
      .where(eq(table.paused, false))
      .all();
  }
  public deadline(id: string): number | undefined {
    return this.sources.database
      .select({ nextAt: table.nextAt })
      .from(table)
      .where(and(eq(table.id, id), eq(table.paused, false)))
      .get()?.nextAt;
  }
  public occurrence(id: string): ScheduleOccurrence | undefined {
    const now = Date.now();

    const row = this.sources.database
      .select()
      .from(table)
      .where(
        and(eq(table.id, id), eq(table.paused, false), lte(table.nextAt, now)),
      )
      .get();

    if (!row) return undefined;

    return {
      prompt: decodeSchedule(row).prompt,
      commitWith: deliveryWrite(row, now),
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
    const schedule: Schedule = {
      ...input,
      id: this.sources.createId(),
      lastQueuedAt: null,
      nextAt: Date.now() + input.intervalSeconds * second,
      paused: false,
    };

    const row = { ...schedule, prompt: JSON.stringify(schedule.prompt) };
    await this.sources.open.write({
      describe: () => 'Create Schedule',
      commit: (tx) => tx.insert(table).values(row).run(),
    });

    return schedule;
  }
  public async change(input: ManageSchedule): Promise<void> {
    const { sessionId, id, action } = input;
    const target = and(eq(table.sessionId, sessionId), eq(table.id, id));
    const row = this.sources.database.select().from(table).where(target).get();

    if (!row)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });
    const update = this.update(row, action);
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
    action: ManageSchedule['action'],
  ): Partial<ScheduleRow> {
    if (action === 'pause') return { paused: true };

    return row.paused
      ? { paused: false, nextAt: Date.now() + row.intervalSeconds * second }
      : { paused: false };
  }
}
