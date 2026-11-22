import type {
  ProjectSchedule,
  ProjectScheduleCadence,
  ProjectScheduleHistoryPage,
  ProjectScheduleInput,
  ProjectScheduleOccurrence,
} from '@repo/contracts/operations';
import { projectSchedule as table } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { readProjectPath } from '../projects';
import type { WriterJob } from '../storage';
import {
  readScheduleHistory,
  writeScheduleOccurrence,
} from './project-schedule-history';
import {
  decode,
  editedSchedule,
  firstOccurrence,
  managedSchedule,
  resolveScheduleSettings,
  scheduleEditTiming,
} from './project-schedule-settings';
import { nextProjectScheduleAt } from './project-schedule-timing';
import type { SessionHandlerSources } from './session-sources';

export type ScheduleTarget = { id: string; projectId: string };

type ScheduleRow = typeof table.$inferSelect;

type HistoryCursor = NonNullable<ProjectScheduleHistoryPage['next']>;

type ScheduleChange = 'pause' | 'resume' | 'delete';

type Preview = { nextAt: number };

const targetOf = ({ id, projectId }: ScheduleTarget): ReturnType<typeof and> =>
  and(eq(table.id, id), eq(table.projectId, projectId));

const currentTiming = (row: ScheduleRow): ReturnType<typeof and> =>
  and(
    targetOf(row),
    eq(table.settings, row.settings),
    eq(table.nextAt, row.nextAt),
    eq(table.paused, row.paused),
  );

interface DueSchedule {
  schedule: ProjectSchedule;
  missed: boolean;
}

export class ProjectScheduleStore {
  public constructor(private readonly sources: SessionHandlerSources) {}

  public list(projectId?: string): ProjectSchedule[] {
    return this.sources.database
      .select()
      .from(table)
      .where(
        projectId === undefined ? undefined : eq(table.projectId, projectId),
      )
      .orderBy(table.nextAt, table.id)
      .all()
      .map((row): ProjectSchedule => decode(row).schedule);
  }

  public deadline(id: string): number | undefined {
    const row = this.row(id);

    return row?.paused ? undefined : row?.nextAt;
  }

  public schedule(target: ScheduleTarget): ProjectSchedule {
    return decode(this.requireRow(target)).schedule;
  }

  public async claimDue(
    id: string,
    now: number,
    missedAtStartup?: number,
  ): Promise<DueSchedule | undefined> {
    const row = this.row(id);

    if (!row || row.paused || row.nextAt > now) return undefined;

    const missed = missedAtStartup === row.nextAt;
    const claimed = await this.advance(row, now, missed);

    return claimed ? { schedule: decode(row).schedule, missed } : undefined;
  }

  private row(id: string): ScheduleRow | undefined {
    return this.sources.database
      .select()
      .from(table)
      .where(eq(table.id, id))
      .get();
  }

  private requireRow({ id, projectId }: ScheduleTarget): ScheduleRow {
    const row = this.row(id);

    if (row?.projectId !== projectId)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project Schedule not found.',
      });

    return row;
  }

  public history(
    target: ScheduleTarget,
    cursor?: HistoryCursor,
  ): ProjectScheduleHistoryPage {
    this.requireRow(target);

    return readScheduleHistory(this.sources.database, target.id, cursor);
  }

  public preview(
    projectId: string,
    cadence: ProjectScheduleCadence,
    id?: string,
  ): Preview {
    if (id)
      return {
        nextAt: scheduleEditTiming(this.requireRow({ id, projectId }), cadence)
          .nextAt,
      };

    readProjectPath(this.sources.database, projectId);

    return { nextAt: firstOccurrence(cadence, Date.now()) };
  }

  public async create(input: ProjectScheduleInput): Promise<ProjectSchedule> {
    const settings = await resolveScheduleSettings(this.sources, input);
    const now = Date.now();

    const row = {
      id: this.sources.createId(),
      projectId: input.projectId,
      settings: JSON.stringify({ ...settings, anchorAt: now }),
      nextAt: firstOccurrence(input.cadence, now),
      latestSessionId: null,
      paused: false,
    };

    await this.sources.open.write({
      describe: () => 'Create Project Schedule',
      commit: (tx) => tx.insert(table).values(row).run(),
    });

    return decode(row).schedule;
  }

  public async edit(
    id: string,
    input: ProjectScheduleInput,
  ): Promise<ProjectSchedule> {
    const target = { id, projectId: input.projectId };
    const settings = await resolveScheduleSettings(this.sources, input);
    const prior = this.requireRow(target);
    const update = editedSchedule(prior, settings);

    const saved = await this.change(
      'Edit Project Schedule',
      (tx) =>
        Number(
          tx
            .update(table)
            .set(update)
            .where(and(targetOf(target), eq(table.settings, prior.settings)))
            .run().changes,
        ) > 0,
    );

    if (!saved) this.changed(target);

    return decode(this.requireRow(target)).schedule;
  }

  public async manage(
    target: ScheduleTarget,
    action: ScheduleChange,
  ): Promise<void> {
    const prior = this.requireRow(target);

    if (action === 'delete') {
      const removed = await this.change(
        'Delete Project Schedule',
        (tx) =>
          Number(tx.delete(table).where(targetOf(target)).run().changes) > 0,
      );

      if (!removed) this.changed(target);

      return;
    }

    const planned = managedSchedule(prior, action);

    const saved = await this.change(
      'Manage Project Schedule',
      (tx) =>
        Number(
          tx.update(table).set(planned).where(currentTiming(prior)).run()
            .changes,
        ) > 0,
    );

    if (!saved) this.changed(target);
  }

  private advance(
    row: ScheduleRow,
    now: number,
    missed: boolean,
  ): Promise<boolean> {
    const { schedule, anchorAt } = decode(row);
    const nextAt = nextProjectScheduleAt(schedule.cadence, now, anchorAt);

    const occurrenceId = missed ? this.sources.createId() : undefined;

    return this.change('Advance Project Schedule', (tx) => {
      const advance = tx
        .update(table)
        .set({ nextAt })
        .where(currentTiming(row))
        .run();

      if (Number(advance.changes) === 0) return false;

      if (occurrenceId !== undefined)
        writeScheduleOccurrence(tx, row.id, {
          id: occurrenceId,
          occurrence: {
            at: row.nextAt,
            through: now,
            outcome: 'skipped',
            reason: 'The Server was offline when this Schedule was due.',
          },
        });

      return true;
    });
  }

  public async record(
    id: string,
    result: ProjectScheduleOccurrence,
  ): Promise<ProjectScheduleOccurrence> {
    const occurrenceId = this.sources.createId();
    await this.sources.open.write({
      describe: () => 'Record Project Schedule occurrence',
      commit: (tx) => {
        const row = tx
          .select({ id: table.id })
          .from(table)
          .where(eq(table.id, id))
          .get();

        if (!row) return;

        writeScheduleOccurrence(tx, id, {
          id: occurrenceId,
          occurrence: result,
        });

        if (result.outcome === 'started')
          tx.update(table)
            .set({ latestSessionId: result.sessionId })
            .where(eq(table.id, id))
            .run();
      },
    });

    return result;
  }

  private async change(
    description: string,
    commit: (tx: Parameters<WriterJob['commit']>[0]) => boolean,
  ): Promise<boolean> {
    let changed = false;
    await this.sources.open.write({
      describe: () => description,
      commit: (tx) => {
        changed = commit(tx);
      },
    });

    return changed;
  }

  private changed(target: ScheduleTarget): never {
    this.requireRow(target);
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'The Schedule changed. Try again.',
    });
  }
}
