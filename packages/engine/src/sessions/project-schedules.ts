import {
  ProjectSchedule,
  type ProjectScheduleInput,
  type ProjectScheduleOccurrence,
} from '@repo/contracts/operations';
import {
  projectSchedule as table,
  projectScheduleOccurrence as occurrences,
} from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { requireInstalledAgent } from '../agents';
import { titleFromPrompt } from '../feed';
import { isFolder, listProjectBranches, readProjectPath } from '../projects';
import { startSessionCreation } from './creation/session-creation';
import { startSchedule, type ScheduleActor } from './schedule-machine';
import { nextIntervalAt } from './schedule-timing';
import type { SessionHandlerSources } from './session-sources';

type ScheduleTarget = { id: string; projectId: string };

const decode = ({
  settings,
  ...row
}: typeof table.$inferSelect): ProjectSchedule =>
  ProjectSchedule.parse({ ...JSON.parse(settings), ...row });

export class ProjectSchedules {
  private readonly actors = new Map<string, ScheduleActor>();
  private readonly launching = new Set<string>();

  public constructor(
    private readonly sources: SessionHandlerSources,
    private readonly stopping?: AbortSignal,
  ) {
    for (const row of this.list()) this.arm(row.id);
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
    const checkout = await this.resolveCheckout(input);
    requireInstalledAgent(this.sources.installedAgents, input.agent);
    const { projectId, ...settings } = input;
    const id = this.sources.createId();
    const now = Date.now();

    const row = {
      id,
      projectId,
      settings: JSON.stringify({
        ...settings,
        checkout,
        name: titleFromPrompt([{ type: 'text', text: input.instructions }]),
      }),
      nextAt: nextIntervalAt(now, input.intervalSeconds, now),
      latestSessionId: null,
    };

    await this.sources.open.write({
      describe: () => 'Create Project Schedule',
      commit: (tx) => tx.insert(table).values(row).run(),
    });

    this.arm(id);

    return decode(row);
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

  public runNow({
    projectId,
    id,
  }: ScheduleTarget): Promise<ProjectScheduleOccurrence> {
    const stored = this.row(id);

    if (stored?.projectId !== projectId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project Schedule not found.',
      });
    }

    return this.run(decode(stored), Date.now(), this.stopping);
  }

  private row(id: string): typeof table.$inferSelect | undefined {
    return this.sources.database
      .select()
      .from(table)
      .where(eq(table.id, id))
      .get();
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

    if (!row || row.nextAt > now) return;

    const schedule = decode(row);
    const nextAt = nextIntervalAt(row.nextAt, schedule.intervalSeconds, now);
    await this.sources.open.write({
      describe: () => 'Advance Project Schedule',
      commit: (tx) =>
        tx
          .update(table)
          .set({ nextAt })
          .where(and(eq(table.id, id), eq(table.nextAt, row.nextAt)))
          .run(),
    });
    await this.run(schedule, row.nextAt, signal);
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
    const latest = this.row(id)?.latestSessionId;

    return (
      this.launching.has(id) ||
      (latest != null && this.sources.open.isRunning(latest))
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
        tx.insert(occurrences)
          .values({
            id: occurrenceId,
            scheduleId: id,
            at: result.at,
            result: JSON.stringify(result),
          })
          .run();

        if (result.outcome === 'started') {
          tx.update(table)
            .set({ latestSessionId: result.sessionId })
            .where(eq(table.id, id))
            .run();
        }
      },
    });

    return result;
  }
}
