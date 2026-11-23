import { SessionPromptInput } from '@repo/contracts';
import {
  ProjectSchedule,
  ScheduleCalendar,
  type ProjectScheduleCadence,
} from '@repo/contracts/operations';
import type { operations } from '@repo/contracts/operations';
import { session, sessionSchedule as table } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, isNotNull, isNull, lte, or } from 'drizzle-orm';
import type { z } from 'zod';
import type { WriterJob } from '../storage';
import type { ListedSchedule } from './project-schedule-settings';
import { nextProjectScheduleAt } from './project-schedule-timing';
import type { NoticeWriter, ScheduleOccurrence } from './schedule-skip';
import { announceScheduleWrite } from './schedule-skip';
import { nextIntervalAt } from './schedule-timing';
import type { HandlerSources } from './session-sources';

export type ScheduleRow = typeof table.$inferSelect;

type Definitions = typeof operations;

export type ManageSchedule = z.output<
  Definitions['session.manageSchedule']['params']
>;

export type Schedule = z.output<
  Definitions['session.schedulePrompt']['result']
>;

// What a task Schedule was created with; its Session keeps these for life (ADR-0067).
export const ScheduleTask = ProjectSchedule.pick({
  agent: true,
  checkout: true,
  configOptions: true,
});

export type ScheduleTask = z.infer<typeof ScheduleTask>;

export interface NewSchedule {
  id: string;
  sessionId: string;
  prompt: Schedule['prompt'];
  // Null for a one-time Schedule.
  cadence: ProjectScheduleCadence | null;
  anchorAt: number;
  nextAt: number;
  endsAt: number | null;
  paused: boolean;
  task: ScheduleTask | null;
}

export type ScheduleEdit = Pick<NewSchedule, 'prompt'> &
  Pick<ScheduleRow, 'anchorAt' | 'nextAt'> & {
    cadence: ProjectScheduleCadence;
  };

/** A Server that returns within this long of a due occurrence still sends it, late. */
const lateGraceMs = 3_600_000;

type ScheduleCadenceColumns = Pick<ScheduleRow, 'intervalSeconds' | 'calendar'>;

type ScheduleTiming = ScheduleCadenceColumns &
  Pick<ScheduleRow, 'lastQueuedAt' | 'lastSkippedAt' | 'endsAt' | 'paused'>;

const repeats = (row: ScheduleCadenceColumns): boolean =>
  row.intervalSeconds !== null || row.calendar !== null;

const completed = (row: ScheduleTiming): boolean =>
  !repeats(row) && (row.lastQueuedAt !== null || row.lastSkippedAt !== null);

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
    or(
      isNotNull(table.intervalSeconds),
      isNotNull(table.calendar),
      and(isNull(table.lastQueuedAt), isNull(table.lastSkippedAt)),
    ),
  );

const calendarOf = ({
  calendar,
}: Pick<ScheduleRow, 'calendar'>): ScheduleCalendar | null =>
  calendar === null ? null : ScheduleCalendar.parse(JSON.parse(calendar));

// A one-time Schedule has no cadence.
export function cadenceOf(
  row: ScheduleCadenceColumns,
): ProjectScheduleCadence | null {
  const calendar = calendarOf(row);

  if (calendar) return calendar;

  return row.intervalSeconds === null
    ? null
    : { type: 'interval', intervalSeconds: row.intervalSeconds };
}

const oneTime: ScheduleCadenceColumns = {
  intervalSeconds: null,
  calendar: null,
};

function cadenceColumns(
  cadence: ProjectScheduleCadence,
): ScheduleCadenceColumns {
  return cadence.type === 'interval'
    ? { intervalSeconds: cadence.intervalSeconds, calendar: null }
    : { intervalSeconds: null, calendar: JSON.stringify(cadence) };
}

export const taskOf = ({ task }: Pick<ScheduleRow, 'task'>): ScheduleTask =>
  ScheduleTask.parse(JSON.parse(task ?? 'null'));

export const promptOf = ({
  prompt,
}: Pick<ScheduleRow, 'prompt'>): Schedule['prompt'] =>
  SessionPromptInput.shape.prompt.parse(JSON.parse(prompt));

// The first occurrence after `now`; a one-time Schedule keeps its own.
function followingAt(row: ScheduleRow, now: number): number {
  const cadence = cadenceOf(row);
  const anchorAt = row.anchorAt ?? row.nextAt;

  if (cadence === null) return row.nextAt;

  if (cadence.type === 'interval')
    return nextIntervalAt(anchorAt, cadence.intervalSeconds, now);

  return nextProjectScheduleAt(cadence, now, anchorAt);
}

const decodeSchedule = (row: ScheduleRow): Schedule => ({
  id: row.id,
  sessionId: row.sessionId,
  prompt: promptOf(row),
  intervalSeconds: row.intervalSeconds,
  calendar: calendarOf(row),
  nextAt: row.nextAt,
  endsAt: row.endsAt,
  lastQueuedAt: row.lastQueuedAt,
  lastSkippedAt: row.lastSkippedAt,
  paused: row.paused,
  listed: row.task !== null,
  state: stateOf(row, Date.now()),
});

type OccurrenceRecord = Partial<
  Pick<ScheduleRow, 'nextAt' | 'lastQueuedAt' | 'lastSkippedAt'>
>;

const recordWrite = (id: string, record: OccurrenceRecord): WriterJob => ({
  describe: () => 'Record scheduled Prompt',
  commit: (tx) => {
    tx.update(table).set(record).where(eq(table.id, id)).run();
  },
});

// One store for every Schedule, made as a task in Scheduled or inside a Session (ADR-0067).
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

    const nextAt = followingAt(row, now);
    // A one-time Schedule whose Prompt is already waiting is done: it has no later occurrence.
    const coalesced = repeats(row) ? { nextAt } : { lastQueuedAt: now };

    return {
      sessionId: row.sessionId,
      prompt: promptOf(row),
      at: row.nextAt,
      timeZone: calendarOf(row)?.timeZone,
      late: now - row.nextAt > lateGraceMs,
      deliveryWrite: recordWrite(row.id, { nextAt, lastQueuedAt: now }),
      coalescedWrite: recordWrite(row.id, coalesced),
      skipWrite: recordWrite(row.id, { nextAt, lastSkippedAt: now }),
    };
  }
  // Run now keeps a repeating Schedule's next occurrence; a one-time Schedule is done once its Prompt is sent.
  public sentNow(id: string): WriterJob {
    return recordWrite(id, { lastQueuedAt: Date.now() });
  }
  public row(id: string): ScheduleRow | undefined {
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
  // Task Schedules, which Scheduled lists, with their Session's Project.
  public listed(projectId?: string): ListedSchedule[] {
    return this.sources.database
      .select({
        row: table,
        projectId: session.projectId,
        archivedAt: session.archivedAt,
        title: session.title,
      })
      .from(table)
      .innerJoin(session, eq(session.id, table.sessionId))
      .where(
        and(
          isNotNull(table.task),
          projectId === undefined
            ? undefined
            : eq(session.projectId, projectId),
        ),
      )
      .orderBy(table.nextAt, table.id)
      .all();
  }
  public async insert(
    { cadence, ...input }: NewSchedule,
    notice?: NoticeWriter,
  ): Promise<Schedule> {
    const row: ScheduleRow = {
      ...input,
      ...(cadence ? cadenceColumns(cadence) : oneTime),
      prompt: JSON.stringify(input.prompt),
      task: input.task && JSON.stringify(input.task),
      lastQueuedAt: null,
      lastSkippedAt: null,
    };

    const insert = announceScheduleWrite(row.sessionId, {
      describe: () => 'Create Schedule',
      commit: (tx) => tx.insert(table).values(row).run(),
    });

    await (notice ? notice(insert) : this.sources.open.write(insert));

    return decodeSchedule(row);
  }
  // A changed cadence counts again from `anchorAt`.
  public async edit(
    id: string,
    { prompt, cadence, ...timing }: ScheduleEdit,
  ): Promise<void> {
    await this.sources.open.write({
      describe: () => 'Edit Schedule',
      commit: (tx) =>
        tx
          .update(table)
          .set({
            prompt: JSON.stringify(prompt),
            ...cadenceColumns(cadence),
            ...timing,
          })
          .where(eq(table.id, id))
          .run(),
    });
  }
  public async change(input: ManageSchedule): Promise<void> {
    const { sessionId, id, action } = input;
    const target = and(eq(table.sessionId, sessionId), eq(table.id, id));
    const row = this.sources.database.select().from(table).where(target).get();

    if (!row)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });

    if (completed(row) && action !== 'delete') return;
    const update = changeOf(row, input);

    await this.sources.open.write(
      announceScheduleWrite(sessionId, {
        describe: () => 'Manage Schedule',
        commit: (tx) => {
          if (action === 'delete') tx.delete(table).where(target).run();
          else tx.update(table).set(update).where(target).run();
        },
      }),
    );
  }
}

function changeOf(
  row: ScheduleRow,
  { action, endsAt }: ManageSchedule,
): Partial<ScheduleRow> {
  const now = Date.now();

  if (action === 'setEnd') return editEnd(row, endsAt, now);

  if (action === 'pause') return { paused: true };

  // A resumed repeat skips what fell due while it was paused.
  if (!row.paused || !repeats(row) || row.nextAt > now)
    return { paused: false };

  return { paused: false, nextAt: followingAt(row, now) };
}

function editEnd(
  row: ScheduleRow,
  endsAt: number | undefined,
  now: number,
): Partial<ScheduleRow> {
  if (!repeats(row))
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Only a repeating Schedule has an end time',
    });

  if (endsAt === undefined || endsAt <= now)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Choose a future end time',
    });

  const nextAt =
    expired(row, now) && row.nextAt <= now ? followingAt(row, now) : row.nextAt;

  return nextAt === row.nextAt ? { endsAt } : { endsAt, nextAt };
}
