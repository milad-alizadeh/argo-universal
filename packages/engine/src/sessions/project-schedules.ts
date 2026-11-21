import {
  type ProjectSchedule,
  type projectScheduleOperations,
  type ProjectScheduleHistoryPage,
  type ProjectScheduleCadence,
  type ProjectScheduleInput,
  type ProjectScheduleOccurrence,
} from '@repo/contracts/operations';
import type { z } from 'zod';
import { hasRunningScheduleSession } from './project-schedule-history';
import { launchScheduledSession } from './project-schedule-launch';
import {
  ProjectScheduleStore,
  type ScheduleTarget,
} from './project-schedule-store';
import { ScheduleTimers } from './schedule-machine';
import type { SessionHandlerSources } from './session-sources';

type OccurrencePreview = { nextAt: number };

type Operations = typeof projectScheduleOperations;

type ScheduleEdit = z.output<Operations['project.scheduleEdit']['params']>;

type ScheduleManagement = z.output<
  Operations['project.scheduleManage']['params']
>;

type ScheduleHistory = z.output<
  Operations['project.scheduleHistory']['params']
>;

export class ProjectSchedules {
  private readonly store: ProjectScheduleStore;
  private readonly timers: ScheduleTimers;
  private readonly launching = new Set<string>();
  private readonly missedAtStartup = new Map<string, number>();

  public constructor(
    private readonly sources: SessionHandlerSources,
    private readonly stopping?: AbortSignal,
  ) {
    this.store = new ProjectScheduleStore(sources);
    this.timers = new ScheduleTimers(
      {
        nextAt: (id): number | undefined => this.store.deadline(id),
        deliver: (id, signal): Promise<void> => this.due(id, signal),
      },
      stopping,
    );

    const now = Date.now();

    for (const row of this.list()) {
      if (row.paused) continue;

      if (row.nextAt < now) this.missedAtStartup.set(row.id, row.nextAt);

      this.timers.refresh(row.id);
    }
  }

  public list(projectId?: string): ProjectSchedule[] {
    return this.store.list(projectId);
  }

  public preview(
    projectId: string,
    cadence: ProjectScheduleCadence,
    id?: string,
  ): OccurrencePreview {
    return this.store.preview(projectId, cadence, id);
  }

  public async create(input: ProjectScheduleInput): Promise<ProjectSchedule> {
    const schedule = await this.store.create(input);
    this.timers.refresh(schedule.id);

    return schedule;
  }

  public async edit({ id, ...input }: ScheduleEdit): Promise<ProjectSchedule> {
    const schedule = await this.store.edit(id, input);
    this.timers.refresh(id);

    return schedule;
  }

  public async manage({
    action,
    ...target
  }: ScheduleManagement): Promise<Record<string, never>> {
    await this.store.manage(target, action);
    this.timers.refresh(target.id);

    return {};
  }

  public history(input: ScheduleHistory): ProjectScheduleHistoryPage {
    return this.store.history(input, input.cursor);
  }

  public runNow(target: ScheduleTarget): Promise<ProjectScheduleOccurrence> {
    return this.run(this.store.schedule(target), Date.now(), this.stopping);
  }

  private async due(id: string, signal: AbortSignal): Promise<void> {
    const due = await this.store.claimDue(
      id,
      Date.now(),
      this.missedAtStartup.get(id),
    );

    if (!due) return;

    this.missedAtStartup.delete(id);

    if (!due.missed && !signal.aborted)
      await this.run(due.schedule, due.schedule.nextAt, signal);
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
      return this.store.record(id, {
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

      return await this.store.record(id, result);
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
}
