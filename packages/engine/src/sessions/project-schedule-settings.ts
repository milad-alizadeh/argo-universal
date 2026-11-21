import {
  ProjectSchedule,
  type ProjectScheduleInput,
  type ProjectScheduleCadence,
} from '@repo/contracts/operations';
import type { projectSchedule as table } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { requireInstalledAgent } from '../agents';
import { titleFromPrompt } from '../feed';
import { isFolder, listProjectBranches, readProjectPath } from '../projects';
import { nextProjectScheduleAt } from './project-schedule-timing';
import type { SessionHandlerSources } from './session-sources';

type ScheduleRow = typeof table.$inferSelect;

type SavedSettings = Pick<
  ProjectSchedule,
  'agent' | 'name' | 'instructions' | 'checkout' | 'cadence' | 'configOptions'
>;

function settingsWithName(
  input: ProjectScheduleInput,
  checkout: ProjectSchedule['checkout'],
): SavedSettings {
  const { agent, instructions, cadence, configOptions } = input;

  return {
    agent,
    instructions,
    cadence,
    configOptions,
    checkout,
    name: titleFromPrompt([{ type: 'text', text: instructions }]),
  };
}

type StoredSchedule = { schedule: ProjectSchedule; anchorAt: number };

const ProjectScheduleSettings = z.looseObject({
  anchorAt: z.number().optional(),
  intervalSeconds: z.number().optional(),
});

export function decode({
  settings: json,
  ...row
}: typeof table.$inferSelect): StoredSchedule {
  const { anchorAt, intervalSeconds, ...settings } =
    ProjectScheduleSettings.parse(JSON.parse(json));

  const schedule = ProjectSchedule.parse({
    cadence: { type: 'interval', intervalSeconds },
    ...settings,
    ...row,
  });

  return { schedule, anchorAt: anchorAt ?? row.nextAt };
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
  anchorAt: number;
  nextAt: number;
  changed: boolean;
}

export function scheduleEditTiming(
  row: ScheduleRow,
  cadence: ProjectScheduleCadence,
): EditTiming {
  const existing = decode(row);

  const changed =
    JSON.stringify(cadence) !== JSON.stringify(existing.schedule.cadence);

  const anchorAt = changed ? Date.now() : existing.anchorAt;
  const nextAt = changed ? firstOccurrence(cadence, anchorAt) : row.nextAt;

  return { anchorAt, nextAt, changed };
}

interface ScheduleEditUpdate {
  settings: string;
  nextAt?: number;
}

export function editedSchedule(
  row: ScheduleRow,
  settings: SavedSettings,
): ScheduleEditUpdate {
  const { anchorAt, nextAt, changed } = scheduleEditTiming(
    row,
    settings.cadence,
  );

  return {
    settings: JSON.stringify({ ...settings, anchorAt }),
    nextAt: changed ? nextAt : undefined,
  };
}

export function managedSchedule(
  row: ScheduleRow,
  action: 'pause' | 'resume',
): Pick<ScheduleRow, 'paused' | 'nextAt'> {
  const now = Date.now();
  const elapsed = row.paused && row.nextAt <= now;

  const { schedule, anchorAt } = decode(row);

  const nextAt =
    action === 'resume' && elapsed
      ? nextProjectScheduleAt(schedule.cadence, now, anchorAt)
      : row.nextAt;

  return { paused: action === 'pause', nextAt };
}

export async function resolveScheduleSettings(
  sources: SessionHandlerSources,
  input: ProjectScheduleInput,
): Promise<SavedSettings> {
  const checkout = await resolveCheckout(sources, input);
  requireInstalledAgent(sources.installedAgents, input.agent);

  return settingsWithName(input, checkout);
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
