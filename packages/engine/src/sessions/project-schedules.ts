import type {
  ProjectSchedule,
  ProjectScheduleCadence,
  ProjectScheduleHistoryPage,
  ProjectScheduleInput,
  ProjectScheduleOccurrence,
  projectScheduleOperations,
} from '@repo/contracts/operations';
import { projectSchedule as legacyTable, session } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import type { z } from 'zod';
import { readProjectPath } from '../projects';
import { startSessionCreation } from './creation/session-creation';
import { readScheduleHistory } from './project-schedule-history';
import {
  decodeLegacy,
  firstOccurrence,
  projectScheduleOf,
  requireSameTask,
  resolveScheduleSettings,
  scheduleEditTiming,
  type LegacySchedule,
  type SavedSettings,
} from './project-schedule-settings';
import type {
  ListedSchedule,
  NewSchedule,
  ScheduleTask,
} from './schedule-store';
import { scheduleSender, type Schedules } from './schedules';
import { renameSession } from './session-rename';
import type { SessionHandlerSources } from './session-sources';

type Operations = typeof projectScheduleOperations;

type ScheduleEdit = z.output<Operations['project.scheduleEdit']['params']>;

type ScheduleManagement = z.output<
  Operations['project.scheduleManage']['params']
>;

type ScheduleHistory = z.output<
  Operations['project.scheduleHistory']['params']
>;

type ScheduleTarget = { id: string; projectId: string };

type SchedulePreview = z.output<
  Operations['project.schedulePreview']['result']
>;

/*
 * Task Schedules: the `project.schedule*` Operations over the one Schedule runner (ADR-0067). A task
 * Schedule creates its Session once, when it is saved, and is listed in Scheduled.
 */
export class ProjectSchedules {
  public constructor(
    private readonly sources: SessionHandlerSources,
    private readonly schedules: Schedules,
    private readonly stopping?: AbortSignal,
  ) {}

  public list(projectId?: string): ProjectSchedule[] {
    return this.schedules.store.listed(projectId).map(projectScheduleOf);
  }

  public preview(
    projectId: string,
    cadence: ProjectScheduleCadence,
    id?: string,
  ): SchedulePreview {
    if (id) {
      const { nextAt } = scheduleEditTiming(
        this.listed({ id, projectId }).row,
        cadence,
      );

      return { nextAt };
    }

    readProjectPath(this.sources.database, projectId);

    return { nextAt: firstOccurrence(cadence, Date.now()) };
  }

  public async create(input: ProjectScheduleInput): Promise<ProjectSchedule> {
    const settings = await resolveScheduleSettings(this.sources, input);
    const now = Date.now();
    const nextAt = firstOccurrence(settings.cadence, now);
    const id = this.sources.createId();
    const sessionId = await this.startSession(id, input.projectId, settings);

    await this.schedules.add({
      id,
      sessionId,
      prompt: instructionsPrompt(settings.instructions),
      cadence: settings.cadence,
      anchorAt: now,
      nextAt,
      endsAt: null,
      paused: false,
      task: taskSettings(settings),
    });

    return projectScheduleOf(this.listed({ id, projectId: input.projectId }));
  }

  public async edit({ id, ...input }: ScheduleEdit): Promise<ProjectSchedule> {
    const target = { id, projectId: input.projectId };
    const { row } = this.listed(target);
    const { instructions, cadence } = requireSameTask(row, input);

    await this.schedules.store.edit(id, {
      prompt: instructionsPrompt(instructions),
      cadence,
      ...scheduleEditTiming(row, cadence),
    });
    this.schedules.refresh(id);

    return projectScheduleOf(this.listed(target));
  }

  public manage({
    action,
    ...target
  }: ScheduleManagement): Promise<Record<string, never>> {
    const { sessionId } = this.listed(target).row;

    return this.schedules.manage({ sessionId, id: target.id, action });
  }

  public history(input: ScheduleHistory): ProjectScheduleHistoryPage {
    this.listed(input);

    return readScheduleHistory(this.sources.database, input.id, input.cursor);
  }

  public async runNow(
    target: ScheduleTarget,
  ): Promise<ProjectScheduleOccurrence> {
    this.listed(target);
    const at = Date.now();
    const sessionId = await this.schedules.runNow(target.id, this.stopping);

    return { at, outcome: 'started', sessionId };
  }

  // Each Project Schedule stored before ADR-0067 becomes a task Schedule with one Session.
  public async migrate(log: (message: string) => void): Promise<void> {
    for (const row of this.legacyRows(log)) {
      if (this.schedules.store.row(row.id)) continue;

      try {
        await this.adopt(decodeLegacy(row));
      } catch (error) {
        log(
          `Could not migrate Project Schedule ${row.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private legacyRows(
    log: (message: string) => void,
  ): (typeof legacyTable.$inferSelect)[] {
    try {
      return this.sources.database.select().from(legacyTable).all();
    } catch (error) {
      log(
        `Could not read Project Schedules to migrate: ${error instanceof Error ? error.message : String(error)}`,
      );

      return [];
    }
  }

  private async adopt(legacy: LegacySchedule): Promise<void> {
    const { id, settings } = legacy;

    const sessionId =
      this.liveSession(legacy.latestSessionId) ??
      (await this.startLegacySession(legacy));

    await this.schedules.add({
      id,
      sessionId,
      prompt: instructionsPrompt(settings.instructions),
      cadence: settings.cadence,
      anchorAt: legacy.anchorAt,
      nextAt: legacy.nextAt,
      endsAt: null,
      paused: legacy.paused,
      task: taskSettings(settings),
    });
  }

  // Recorded on the legacy row first, so a retry after a failed save adopts this Session instead of starting another.
  private async startLegacySession({
    id,
    projectId,
    settings,
  }: LegacySchedule): Promise<string> {
    const sessionId = await this.startSession(id, projectId, {
      ...settings,
      name: '',
    });

    await this.sources.open.write({
      describe: () => 'Record a migrated Project Schedule Session',
      commit: (tx) =>
        tx
          .update(legacyTable)
          .set({ latestSessionId: sessionId })
          .where(eq(legacyTable.id, id))
          .run(),
    });

    return sessionId;
  }

  private liveSession(sessionId: string | null): string | undefined {
    if (sessionId === null) return undefined;

    const row = this.sources.database
      .select({ archivedAt: session.archivedAt })
      .from(session)
      .where(eq(session.id, sessionId))
      .get();

    return row && row.archivedAt === null ? sessionId : undefined;
  }

  // The task Schedule's one Session, created with no first Prompt.
  private async startSession(
    scheduleId: string,
    projectId: string,
    { agent, checkout, configOptions, name }: SavedSettings,
  ): Promise<string> {
    const creation = await startSessionCreation(
      this.sources,
      { projectId, agent, checkout, configOptions, prompt: [] },
      {
        startedBySessionId: null,
        sender: scheduleSender(scheduleId),
        signal: this.stopping,
      },
    );

    const { sessionId } = await creation.accepted;

    if (name)
      await renameSession(this.sources.open, { sessionId, title: name });

    return sessionId;
  }

  private listed(target: ScheduleTarget): ListedSchedule {
    const listed = this.schedules.store
      .listed(target.projectId)
      .find(({ row }) => row.id === target.id);

    if (!listed) throw notFound();

    return listed;
  }
}

const taskSettings = ({
  agent,
  checkout,
  configOptions,
}: ScheduleTask): ScheduleTask => ({ agent, checkout, configOptions });

const instructionsPrompt = (text: string): NewSchedule['prompt'] => [
  { type: 'text', text },
];

const notFound = (): TRPCError =>
  new TRPCError({ code: 'NOT_FOUND', message: 'Project Schedule not found.' });
