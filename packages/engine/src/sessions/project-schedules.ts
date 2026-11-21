import {
  ProjectSchedule,
  type projectScheduleOperations,
  type ProjectScheduleHistoryPage,
  type ProjectScheduleInput,
  type ProjectScheduleOccurrence,
} from '@repo/contracts/operations';
import { projectSchedule as table } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import type { z } from 'zod';
import { requireInstalledAgent } from '../agents';
import { titleFromPrompt } from '../feed';
import { isFolder, listProjectBranches, readProjectPath } from '../projects';
import { startSessionCreation } from './creation/session-creation';
import {
  hasRunningScheduleSession,
  readScheduleHistory,
  writeScheduleOccurrence,
} from './project-schedule-history';
import { startSchedule, type ScheduleActor } from './schedule-machine';
import { nextIntervalAt } from './schedule-timing';
import type { SessionHandlerSources } from './session-sources';

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

type SavedSettings = Pick<
  ProjectSchedule,
  | 'agent'
  | 'name'
  | 'instructions'
  | 'checkout'
  | 'intervalSeconds'
  | 'configOptions'
>;

function scheduleMissing(): TRPCError {
  return new TRPCError({
    code: 'NOT_FOUND',
    message: 'Project Schedule not found.',
  });
}

function advanceInterval(schedule: ProjectSchedule, after: number): number {
  return nextIntervalAt(schedule.nextAt, schedule.intervalSeconds, after);
}

function settingsWithName(
  input: ProjectScheduleInput,
  checkout: ProjectSchedule['checkout'],
): SavedSettings {
  const { agent, instructions, intervalSeconds, configOptions } = input;

  return {
    agent,
    instructions,
    intervalSeconds,
    configOptions,
    checkout,
    name: titleFromPrompt([{ type: 'text', text: instructions }]),
  };
}

const decode = ({
  settings,
  ...row
}: typeof table.$inferSelect): ProjectSchedule =>
  ProjectSchedule.parse({ ...JSON.parse(settings), ...row });

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
      .map(decode);
  }

  public async create(input: ProjectScheduleInput): Promise<ProjectSchedule> {
    const settings = await this.resolveSettings(input);
    const { projectId } = input;
    const id = this.sources.createId();
    const now = Date.now();

    const row = {
      id,
      projectId,
      settings: JSON.stringify(settings),
      nextAt: nextIntervalAt(now, input.intervalSeconds, now),
      latestSessionId: null,
      paused: false,
    };

    await this.sources.open.write({
      describe: () => 'Create Project Schedule',
      commit: (tx) => tx.insert(table).values(row).run(),
    });

    this.arm(id);

    return decode(row);
  }

  public async edit({ id, ...input }: ScheduleEdit): Promise<ProjectSchedule> {
    const target = { id, projectId: input.projectId };
    this.requireRow(target);
    const settings = await this.resolveSettings(input);
    await this.sources.open.write({
      describe: () => 'Edit Project Schedule',
      commit: (tx) => {
        const row = this.row(id);

        if (row?.projectId !== target.projectId) return;

        tx.update(table)
          .set(editedSchedule(row, settings))
          .where(eq(table.id, id))
          .run();
      },
    });

    this.rearm(id);

    return decode(this.requireRow(target));
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

  private async resolveSettings(
    input: ProjectScheduleInput,
  ): Promise<SavedSettings> {
    const checkout = await this.resolveCheckout(input);
    requireInstalledAgent(this.sources.installedAgents, input.agent);

    return settingsWithName(input, checkout);
  }

  private async resolveCheckout({
    checkout,
    projectId,
  }: ProjectScheduleInput): Promise<ProjectSchedule['checkout']> {
    const path = readProjectPath(this.sources.database, projectId);

    if (!(await isFolder(path))) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'The Project folder is unavailable on the Server.',
      });
    }

    if (checkout?.type === 'main') return checkout;

    const { branches, currentBranch } = await listProjectBranches(
      this.sources.database,
      { projectId },
    );

    const baseBranch = checkout?.baseBranch ?? currentBranch;

    if (baseBranch === null || !branches.includes(baseBranch)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Choose an existing branch for the worktree.',
      });
    }

    return { type: 'worktree', baseBranch };
  }

  public runNow(target: ScheduleTarget): Promise<ProjectScheduleOccurrence> {
    return this.run(decode(this.requireRow(target)), Date.now(), this.stopping);
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
      await this.run(decode(row), row.nextAt, signal);
  }

  private async advance(
    row: ScheduleRow,
    now: number,
    missed: boolean,
  ): Promise<boolean> {
    const nextAt = advanceInterval(decode(row), now);
    const occurrenceId = this.sources.createId();
    let advanced = false;

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
      const result = await this.launch(schedule, at, signal);

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

  private async launch(
    {
      id,
      projectId,
      agent,
      checkout,
      configOptions,
      instructions,
    }: ProjectSchedule,
    at: number,
    signal?: AbortSignal,
  ): Promise<ProjectScheduleOccurrence> {
    try {
      const creation = await startSessionCreation(
        this.sources,
        {
          projectId,
          agent,
          checkout,
          configOptions,
          prompt: [{ type: 'text', text: instructions }],
        },
        {
          startedBySessionId: null,
          sender: { type: 'schedule', scheduleId: id, title: 'Schedule' },
          signal,
        },
      );

      const { sessionId } = await creation.accepted;

      return { at, outcome: 'started', sessionId };
    } catch (error) {
      return {
        at,
        outcome: 'failed',
        reason:
          error instanceof Error
            ? error.message
            : 'Could not start the Session.',
      };
    }
  }

  private async record(
    id: string,
    result: ProjectScheduleOccurrence,
  ): Promise<ProjectScheduleOccurrence> {
    const occurrenceId = this.sources.createId();
    await this.sources.open.write({
      describe: () => 'Record Project Schedule occurrence',
      commit: (tx) => {
        if (this.row(id)) writeScheduleOccurrence(tx, id, { id: occurrenceId, occurrence: result });
      },
    });

    return result;
  }
}

function editedSchedule(
  row: ScheduleRow,
  settings: SavedSettings,
): Pick<ScheduleRow, 'settings' | 'nextAt'> {
  const now = Date.now();

  const nextAt =
    settings.intervalSeconds === decode(row).intervalSeconds
      ? row.nextAt
      : nextIntervalAt(now, settings.intervalSeconds, now);

  return { settings: JSON.stringify(settings), nextAt };
}

function managedSchedule(
  row: ScheduleRow,
  action: 'pause' | 'resume',
): Pick<ScheduleRow, 'paused' | 'nextAt'> {
  const now = Date.now();
  const elapsed = row.paused && row.nextAt <= now;

  const nextAt =
    action === 'resume' && elapsed
      ? advanceInterval(decode(row), now)
      : row.nextAt;

  return { paused: action === 'pause', nextAt };
}
