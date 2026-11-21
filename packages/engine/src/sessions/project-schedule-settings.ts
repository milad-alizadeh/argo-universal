import {
  ProjectSchedule,
  type ProjectScheduleInput,
  type ProjectScheduleCadence,
} from '@repo/contracts/operations';
import type { projectSchedule as table } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { titleFromPrompt } from '../feed';
import { nextProjectScheduleAt } from './project-schedule-timing';

type ScheduleRow = typeof table.$inferSelect;
export type SavedSettings = Pick<
  ProjectSchedule,
  'agent' | 'name' | 'instructions' | 'checkout' | 'cadence' | 'configOptions'
>;

export function settingsWithName(
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

export function editedSchedule(
  row: ScheduleRow,
  settings: SavedSettings,
): Pick<ScheduleRow, 'settings' | 'nextAt'> {
  const existing = decode(row);
  const changed =
    JSON.stringify(settings.cadence) !==
    JSON.stringify(existing.schedule.cadence);
  const anchorAt = changed ? Date.now() : existing.anchorAt;
  const nextAt = changed
    ? firstOccurrence(settings.cadence, anchorAt)
    : row.nextAt;

  return { settings: JSON.stringify({ ...settings, anchorAt }), nextAt };
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
