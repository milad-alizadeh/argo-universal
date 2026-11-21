import {
  type ProjectSchedule,
  type projectScheduleOperations,
  type ProjectScheduleHistoryPage,
  type ProjectScheduleCadence,
  type ProjectScheduleInput,
  type ProjectScheduleOccurrence,
} from '@repo/contracts/operations';
import { projectSchedule as table } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import type { z } from 'zod';
import { readProjectPath } from '../projects';
import {
  hasRunningScheduleSession,
  readScheduleHistory,
  writeScheduleOccurrence,
} from './project-schedule-history';
import { launchScheduledSession } from './project-schedule-launch';
import {
  decode,
  firstOccurrence,
  managedSchedule,
  resolveScheduleSettings,
  scheduleEditTiming,
  writeScheduleEdit,
} from './project-schedule-settings';
import { nextProjectScheduleAt } from './project-schedule-timing';
import { startSchedule, type ScheduleActor } from './schedule-machine';
import type { SessionHandlerSources } from './session-sources';

type OccurrencePreview = { nextAt: number };

type ScheduleTarget = { id: string; projectId: string };

type ScheduleRow = typeof table.$inferSelect;

type Operations = typeof projectScheduleOperations;

type ScheduleEdit = z.output<Operations['project.scheduleEdit']['params']>;

type ScheduleManagement = z.output<
  Operations['project.scheduleManage']['params']
>;

type ScheduleHistory = z.output<
  Operations['project.scheduleHistory']['params']
>;

function scheduleMissing(): TRPCError {
  return new TRPCError({
    code: 'NOT_FOUND',
    message: 'Project Schedule not found.',
  });
}

export class ProjectSchedules {
  private readonly actors = new Map<string, ScheduleActor>();
  private readonly launching = new Set<string>();
  private readonly missedAtStartup = new Map<string, number>();

  public constructor(
    private readonly sources: SessionHandlerSources,
    private readonly stopping?: AbortSignal,
  ) {
    const now = Date.now();

    for (const row of this.list()) {
      if (row.paused) continue;

      if (row.nextAt < now) this.missedAtStartup.set(row.id, row.nextAt);

      this.arm(row.id);
    }

    stopping?.addEventListener(
      'abort',
      () => {
        for (const actor of this.actors.values()) actor.stop();
        this.actors.clear();
      },
      { once: true },
    );
  }

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

  public preview(
    projectId: string,
    cadence: ProjectScheduleCadence,
    id?: string,
  ): OccurrencePreview {
    if (id) {
      const row = this.requireRow({ projectId, id });

      return { nextAt: scheduleEditTiming(row, cadence).nextAt };
    }

    readProjectPath(this.sources.database, projectId);

    return { nextAt: firstOccurrence(cadence, Date.now()) };
  }

  public async create(input: ProjectScheduleInput): Promise<ProjectSchedule> {
    const settings = await resolveScheduleSettings(this.sources, input);
    const { projectId } = input;
    const id = this.sources.createId();
    const now = Date.now();

    const row = {
      id,
      projectId,
      settings: JSON.stringify({ ...settings, anchorAt: now }),
      nextAt: firstOccurrence(input.cadence, now),
      latestSessionId: null,
      paused: false,
    };

    await this.sources.open.write({
      describe: () => 'Create Project Schedule',
      commit: (tx) => tx.insert(table).values(row).run(),
    });

    this.arm(id);

    return decode(row).schedule;
  }

  public async edit({ id, ...input }: ScheduleEdit): Promise<ProjectSchedule> {
    const target = { id, projectId: input.projectId };
    const settings = await resolveScheduleSettings(this.sources, input);
    const prior = this.requireRow(target);
    const saved = await writeScheduleEdit(this.sources, prior, settings);

    if (!saved) {
      this.requireRow(target);
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'The Schedule changed. Try again.',
      });
    }

    this.rearm(id);

    return decode(this.requireRow(target)).schedule;
  }

  public async manage({
    action,
    ...target
  }: ScheduleManagement): Promise<Record<string, never>> {
    this.requireRow(target);
    const { id } = target;
    await this.sources.open.write({
      describe: () => 'Manage Project Schedule',
      commit: (tx) => {
        const row = this.row(id);

        if (row?.projectId !== target.projectId) return;

        if (action === 'delete') {
          tx.delete(table).where(eq(table.id, id)).run();
        } else {
          tx.update(table)
            .set(managedSchedule(row, action))
            .where(eq(table.id, id))
            .run();
        }
      },
    });

    this.rearm(id);

    return {};
  }

  public history(input: ScheduleHistory): ProjectScheduleHistoryPage {
    this.requireRow(input);

    return readScheduleHistory(this.sources.database, input.id, input.cursor);
  }

  public runNow(target: ScheduleTarget): Promise<ProjectScheduleOccurrence> {
    return this.run(
      decode(this.requireRow(target)).schedule,
      Date.now(),
      this.stopping,
    );
  }

  private requireRow({ id, projectId }: ScheduleTarget): ScheduleRow {
    const stored = this.row(id);

    if (stored?.projectId !== projectId) throw scheduleMissing();

    return stored;
  }

  private row(id: string): typeof table.$inferSelect | undefined {
    return this.sources.database
      .select()
      .from(table)
      .where(eq(table.id, id))
      .get();
  }

  private rearm(id: string): void {
    this.actors.get(id)?.stop();
    this.actors.delete(id);

    const row = this.row(id);

    if (row && !row.paused) this.arm(id);
  }

  private arm(id: string): void {
    if (this.stopping?.aborted) return;

    const actor = startSchedule({
      now: Date.now,
      nextAt: () => this.row(id)?.nextAt ?? Infinity,
      deliver: (signal) => this.due(id, signal),
    });

    this.actors.set(id, actor);
  }

  private async due(id: string, signal: AbortSignal): Promise<void> {
    const row = this.row(id);
    const now = Date.now();

    if (!row || row.paused || row.nextAt > now) return;

    const missed = this.missedAtStartup.get(id) === row.nextAt;
    const advanced = await this.advance(row, now, missed);

    if (advanced) this.missedAtStartup.delete(id);

    if (advanced && !missed && !signal.aborted)
      await this.run(decode(row).schedule, row.nextAt, signal);
  }

  private async advance(
    row: ScheduleRow,
    now: number,
    missed: boolean,
  ): Promise<boolean> {
    const occurrenceId = this.sources.createId();
    let advanced = false;

    const { schedule, anchorAt } = decode(row);
    const nextAt = nextProjectScheduleAt(schedule.cadence, now, anchorAt);
    await this.sources.open.write({
      describe: () => 'Advance Project Schedule',
      commit: (tx) => {
        const change = tx
          .update(table)
          .set({ nextAt })
          .where(
            and(
              eq(table.id, row.id),
              eq(table.nextAt, row.nextAt),
              eq(table.paused, false),
            ),
          )
          .run();

        advanced = Number(change.changes) > 0;

        if (advanced && missed)
          writeScheduleOccurrence(tx, row.id, {
            id: occurrenceId,
            occurrence: {
              at: row.nextAt,
              through: now,
              outcome: 'skipped',
              reason: 'The Server was offline when this Schedule was due.',
            },
          });
      },
    });

    return advanced;
  }

  private async run(
    schedule: ProjectSchedule,
    at: number,
    signal?: AbortSignal,
  ): Promise<ProjectScheduleOccurrence> {
    const { id } = schedule;
    signal?.throwIfAborted();
    this.stopping?.throwIfAborted();

    if (this.hasWorkingRun(id)) {
      return this.record(id, {
        at,
        outcome: 'skipped',
        reason:
          'The previous Session is still working or waiting for approval.',
      });
    }

    this.launching.add(id);

    try {
      const result = await launchScheduledSession(this.sources, schedule, {
        at,
        signal,
      });

      return await this.record(id, result);
    } finally {
      this.launching.delete(id);
    }
  }

  private hasWorkingRun(id: string): boolean {
    return (
      this.launching.has(id) ||
      hasRunningScheduleSession(
        this.sources.database,
        id,
        this.sources.open.runningSessionIds(),
      )
    );
  }

  private async record(
    id: string,
    result: ProjectScheduleOccurrence,
  ): Promise<ProjectScheduleOccurrence> {
    const occurrenceId = this.sources.createId();
    await this.sources.open.write({
      describe: () => 'Record Project Schedule occurrence',
      commit: (tx) => {
        if (this.row(id))
          writeScheduleOccurrence(tx, id, {
            id: occurrenceId,
            occurrence: result,
          });
      },
    });

    return result;
  }
}
