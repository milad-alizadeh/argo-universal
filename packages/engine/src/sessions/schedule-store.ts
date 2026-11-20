import { SessionPromptInput } from '@repo/contracts';
import type { operations } from '@repo/contracts/operations';
import { sessionSchedule as table } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import type { z } from 'zod';
import type { WriterJob } from '../storage';
import type { SessionHandlerSources } from './session-sources';

export type ScheduleRow = typeof table.$inferSelect;

type Definitions = typeof operations;

type Create = z.output<Definitions['session.schedulePrompt']['params']>;

type Manage = z.output<Definitions['session.manageSchedule']['params']>;

type Schedule = z.output<Definitions['session.schedulePrompt']['result']>;

export const second = 1000;

export const decodeSchedule = ({ prompt, ...row }: ScheduleRow): Schedule => ({
  ...row,
  prompt: SessionPromptInput.shape.prompt.parse(JSON.parse(prompt)),
});

export function deliveryWrite(row: ScheduleRow, now: number): WriterJob {
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
  public constructor(private readonly sources: SessionHandlerSources) {}
  public active(): ScheduleRow[] {
    return this.sources.database
      .select()
      .from(table)
      .where(eq(table.paused, false))
      .all();
  }
  public get(id: string): ScheduleRow | undefined {
    return this.sources.database
      .select()
      .from(table)
      .where(eq(table.id, id))
      .get();
  }
  public list(sessionId: string): Schedule[] {
    return this.sources.database
      .select()
      .from(table)
      .where(eq(table.sessionId, sessionId))
      .all()
      .map(decodeSchedule);
  }
  public async insert(input: Create): Promise<ScheduleRow> {
    const row: ScheduleRow = {
      ...input,
      id: this.sources.createId(),
      prompt: JSON.stringify(input.prompt),
      lastQueuedAt: null,
      nextAt: Date.now() + input.intervalSeconds * second,
      paused: false,
    };

    await this.sources.open.write({
      describe: () => 'Create Schedule',
      commit: (tx) => tx.insert(table).values(row).run(),
    });

    return row;
  }
  public async change(input: Manage): Promise<void> {
    const { sessionId, id, action } = input;
    const target = and(eq(table.sessionId, sessionId), eq(table.id, id));
    const row = this.get(id);

    if (row?.sessionId !== sessionId)
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
    action: Manage['action'],
  ): Partial<ScheduleRow> {
    if (action === 'pause') return { paused: true };

    return row.paused
      ? { paused: false, nextAt: Date.now() + row.intervalSeconds * second }
      : { paused: false };
  }
}
