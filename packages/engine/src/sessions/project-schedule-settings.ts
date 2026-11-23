import {
  ProjectSchedule,
  ProjectScheduleInput,
  type ProjectScheduleCadence,
} from '@repo/contracts/operations';
import type { projectSchedule as legacyTable } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { requireInstalledAgent } from '../agents';
import { titleFromPrompt } from '../feed';
import { isFolder, listProjectBranches, readProjectPath } from '../projects';
import { nextProjectScheduleAt } from './project-schedule-timing';
import {
  cadenceOf,
  promptOf,
  taskOf,
  type ListedSchedule,
  ScheduleTask,
  type ScheduleRow,
} from './schedule-store';
import type { SessionHandlerSources } from './session-sources';

export type SavedSettings = ScheduleTask &
  Pick<ProjectSchedule, 'instructions' | 'cadence' | 'name'>;

const nameOf = (instructions: string): string =>
  titleFromPrompt([{ type: 'text', text: instructions }]);

const instructionsOf = (row: ScheduleRow): string =>
  promptOf(row)
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('');

// A task Schedule as `project.schedule*` callers read it.
export function projectScheduleOf({
  row,
  projectId,
}: ListedSchedule): ProjectSchedule {
  const instructions = instructionsOf(row);

  return ProjectSchedule.parse({
    ...taskOf(row),
    id: row.id,
    projectId,
    name: nameOf(instructions),
    instructions,
    cadence: cadenceOf(row),
    nextAt: row.nextAt,
    sessionId: row.sessionId,
    latestSessionId: row.sessionId,
    paused: row.paused,
  });
}

// A Project Schedule as stored before every Schedule prompted one Session; read only to migrate it.
export interface LegacySchedule {
  id: string;
  projectId: string;
  settings: ProjectScheduleInput & { checkout: ProjectSchedule['checkout'] };
  anchorAt: number;
  nextAt: number;
  paused: boolean;
  latestSessionId: string | null;
}

const LegacySettings = z.looseObject({
  anchorAt: z.number().optional(),
  intervalSeconds: z.number().optional(),
});

export function decodeLegacy({
  settings: json,
  ...row
}: typeof legacyTable.$inferSelect): LegacySchedule {
  const { anchorAt, intervalSeconds, ...settings } = LegacySettings.parse(
    JSON.parse(json),
  );

  const { agent, instructions, cadence, checkout, configOptions } =
    ProjectSchedule.parse({
      cadence: { type: 'interval', intervalSeconds },
      ...settings,
      ...row,
      sessionId: row.latestSessionId ?? '',
    });

  return {
    ...row,
    settings: {
      projectId: row.projectId,
      agent,
      instructions,
      cadence,
      checkout,
      configOptions,
    },
    anchorAt: anchorAt ?? row.nextAt,
  };
}

export function firstOccurrence(
  cadence: ProjectScheduleCadence,
  now: number,
): number {
  try {
    const nextAt = nextProjectScheduleAt(cadence, now, now);
    // A recurrence needs another valid deadline even when its first run is today.
    nextProjectScheduleAt(cadence, nextAt, now);

    return nextAt;
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;

    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'Choose a recurrence with a next occurrence within the supported date range.',
      cause: error,
    });
  }
}

interface EditTiming {
  anchorAt: number | null;
  nextAt: number;
}

// A changed cadence counts again from now; an unchanged one keeps its next occurrence.
export function scheduleEditTiming(
  row: ScheduleRow,
  cadence: ProjectScheduleCadence,
): EditTiming {
  if (JSON.stringify(cadence) === JSON.stringify(cadenceOf(row)))
    return { anchorAt: row.anchorAt, nextAt: row.nextAt };

  const now = Date.now();

  return { anchorAt: now, nextAt: firstOccurrence(cadence, now) };
}

const sameTask = (a: ScheduleTask, b: ScheduleTask): boolean =>
  JSON.stringify(ScheduleTask.parse(a)) ===
  JSON.stringify(ScheduleTask.parse(b));

// The Agent, Checkout and configuration belong to the Schedule's Session once it exists (ADR-0067).
export function requireSameTask(row: ScheduleRow, edit: ScheduleTask): void {
  if (!sameTask(taskOf(row), edit))
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        "A Schedule's Agent, Checkout and configuration belong to its Session and cannot change.",
    });
}

export async function resolveScheduleSettings(
  sources: SessionHandlerSources,
  input: ProjectScheduleInput,
): Promise<SavedSettings> {
  const checkout = await resolveCheckout(sources, input);
  requireInstalledAgent(sources.installedAgents, input.agent);

  const { agent, instructions, cadence, configOptions } =
    ProjectScheduleInput.parse(input);

  return {
    agent,
    instructions,
    cadence,
    configOptions,
    checkout,
    name: nameOf(instructions),
  };
}

async function resolveCheckout(
  sources: SessionHandlerSources,
  { checkout, projectId }: ProjectScheduleInput,
): Promise<ProjectSchedule['checkout']> {
  const path = readProjectPath(sources.database, projectId);

  if (!(await isFolder(path))) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The Project folder is unavailable on the Server.',
    });
  }

  if (checkout?.type === 'main') return checkout;

  const { branches, currentBranch } = await listProjectBranches(
    sources.database,
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
