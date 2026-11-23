import { z } from 'zod';
import { InitialConfigOption, SessionCheckoutChoice } from '../sessions/new';
import type { OperationDefinition } from './index';

const projectId = z
  .string()
  .min(1)
  .describe('The destination Project. Ask before saving if it is ambiguous.');

const instructions = z
  .string()
  .trim()
  .min(1, 'Enter instructions for the Session.');

const maximumIntervalSeconds = 31_536_000;

const intervalSeconds = z
  .int()
  .positive('Enter an interval of at least one second.')
  .max(maximumIntervalSeconds);

export const ScheduleWeekday = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

export type ScheduleWeekday = z.infer<typeof ScheduleWeekday>;

const weekdays = z
  .array(ScheduleWeekday)
  .min(1, 'Choose at least one day.')
  .refine(
    (days) => new Set(days).size === days.length,
    'Choose each day once.',
  );

function validTimeZone(timeZone: string): boolean {
  if (timeZone.startsWith('+') || timeZone.startsWith('-')) return false;

  try {
    new Intl.DateTimeFormat('en', { timeZone });

    return true;
  } catch {
    return false;
  }
}

const localFields = {
  localTime: z
    .string()
    .regex(
      /^(?:[01]\d|2[0-3]):[0-5]\d$/,
      'Enter a local time in HH:mm format.',
    ),
  timeZone: z.string().refine(validTimeZone, 'Choose a valid IANA time zone.'),
};

const customInterval = z
  .strictObject({
    type: z.literal('custom'),
    every: z.int().positive(),
    unit: z.enum(['day', 'week']),
    weekdays: weekdays.optional(),
    ...localFields,
  })
  .refine(
    ({ unit, weekdays: days }) => (unit === 'week') === (days !== undefined),
    'Choose weekdays for a weekly repeat.',
  );

const calendarCadences = [
  z.strictObject({ type: z.literal('daily'), ...localFields }),
  z.strictObject({ type: z.literal('weekdays'), ...localFields }),
  z.strictObject({ type: z.literal('weekly'), weekdays, ...localFields }),
  customInterval,
] as const;

// A repeat at a local time in a time zone.
export const ScheduleCalendar = z.discriminatedUnion('type', [
  ...calendarCadences,
]);

export type ScheduleCalendar = z.infer<typeof ScheduleCalendar>;

export const ProjectScheduleCadence = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('interval'), intervalSeconds }),
  ...calendarCadences,
]);

export type ProjectScheduleCadence = z.infer<typeof ProjectScheduleCadence>;

const checkout = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('worktree'),
    baseBranch: z.string().min(1).optional(),
  }),
  SessionCheckoutChoice.options[1],
]);

export const ProjectScheduleInput = z.strictObject({
  projectId,
  agent: z.string().min(1),
  instructions,
  cadence: ProjectScheduleCadence,
  checkout: checkout
    .optional()
    .describe(
      'Defaults to a fresh worktree. Choose main explicitly to use the main Checkout.',
    ),
  configOptions: z.array(InitialConfigOption).default([]),
});

export const ProjectSchedule = ProjectScheduleInput.extend({
  id: z.string(),
  name: z.string(),
  checkout: SessionCheckoutChoice,
  nextAt: z.number(),
  // The one Session every occurrence prompts (ADR-0067).
  sessionId: z.string(),
  // The same Session, kept for callers that read the former run-list field.
  latestSessionId: z.string().nullable(),
  paused: z.boolean(),
});

const occurrenceFields = { at: z.number() };

export const ProjectScheduleOccurrence = z.discriminatedUnion('outcome', [
  z.strictObject({
    ...occurrenceFields,
    outcome: z.literal('started'),
    sessionId: z.string(),
  }),
  z.strictObject({
    ...occurrenceFields,
    outcome: z.literal('skipped'),
    reason: z.string(),
    through: z.number().optional(),
  }),
  z.strictObject({
    ...occurrenceFields,
    outcome: z.literal('failed'),
    reason: z.string(),
  }),
]);

export type ProjectSchedule = z.infer<typeof ProjectSchedule>;

export type ProjectScheduleInput = z.infer<typeof ProjectScheduleInput>;

export type ProjectScheduleOccurrence = z.infer<
  typeof ProjectScheduleOccurrence
>;

const target = z.strictObject({ projectId, id: z.string().min(1) });

const historyCursor = z.strictObject({ at: z.number(), id: z.string() });

const ProjectScheduleHistoryEntry = z.strictObject({
  id: z.string(),
  occurrence: ProjectScheduleOccurrence,
});

export type ProjectScheduleHistoryEntry = z.infer<
  typeof ProjectScheduleHistoryEntry
>;

export const ProjectScheduleHistoryPage = z.strictObject({
  entries: z.array(ProjectScheduleHistoryEntry),
  next: historyCursor.nullable(),
});

export type ProjectScheduleHistoryPage = z.infer<
  typeof ProjectScheduleHistoryPage
>;

const scopePolicy = 'ask-outside-project';

const scheduleIcon = 'clock';

export const projectScheduleOperations = {
  'project.scheduleCreate': {
    id: 'project.scheduleCreate',
    label: 'Create Project Schedule',
    icon: scheduleIcon,
    description:
      'Schedule a task. Creates its Session now; every occurrence sends the instructions into that Session. Clarify an ambiguous destination and confirm the saved instructions, Project and next occurrence.',
    params: ProjectScheduleInput,
    result: ProjectSchedule,
    tier: 'act',
    policy: scopePolicy,
    keywords: ['schedule', 'recurring', 'interval'],
  },
  'project.schedulePreview': {
    id: 'project.schedulePreview',
    label: 'Preview Project Schedule',
    icon: scheduleIcon,
    description: 'Preview the next occurrence in Unix milliseconds.',
    params: z.strictObject({
      projectId,
      cadence: ProjectScheduleCadence,
      id: target.shape.id.optional(),
    }),
    result: z.strictObject({ nextAt: z.number() }),
    tier: 'read',
    policy: scopePolicy,
    keywords: ['schedule', 'next occurrence', 'repeat', 'time zone'],
  },
  'project.scheduleList': {
    id: 'project.scheduleList',
    label: 'List Project Schedules',
    icon: scheduleIcon,
    description:
      'List Project Schedules. A Session caller defaults to its own Project.',
    params: z.strictObject({ projectId: projectId.optional() }),
    result: z.array(ProjectSchedule),
    tier: 'read',
    policy: scopePolicy,
    keywords: ['scheduled', 'recurring', 'interval'],
  },
  'project.scheduleEdit': {
    id: 'project.scheduleEdit',
    label: 'Edit Project Schedule',
    icon: scheduleIcon,
    description:
      "Edit a Project Schedule's instructions and cadence. Its Agent, Checkout and configuration belong to its Session and cannot change.",
    params: ProjectScheduleInput.extend({ id: target.shape.id }),
    result: ProjectSchedule,
    tier: 'act',
    policy: scopePolicy,
    keywords: ['schedule', 'edit', 'update'],
  },
  'project.scheduleManage': {
    id: 'project.scheduleManage',
    label: 'Manage Project Schedule',
    icon: scheduleIcon,
    description:
      'Pause, resume or delete a Project Schedule. Deleting it leaves its Session as an ordinary Session.',
    params: target.extend({ action: z.enum(['pause', 'resume', 'delete']) }),
    result: z.strictObject({}),
    tier: 'act',
    policy: scopePolicy,
    keywords: ['schedule', 'pause', 'resume', 'delete'],
  },
  'project.scheduleHistory': {
    id: 'project.scheduleHistory',
    label: 'Read Project Schedule history',
    icon: scheduleIcon,
    description:
      'Read the runs recorded before a Schedule prompted one Session. New occurrences are in its Session Feed.',
    params: target.extend({ cursor: historyCursor.optional() }),
    result: ProjectScheduleHistoryPage,
    tier: 'read',
    policy: scopePolicy,
    keywords: ['schedule', 'history', 'occurrence'],
  },
  'project.scheduleRunNow': {
    id: 'project.scheduleRunNow',
    label: 'Run Project Schedule now',
    icon: scheduleIcon,
    description:
      "Send the Schedule's instructions into its Session now without moving its next occurrence.",
    params: target,
    result: ProjectScheduleOccurrence,
    tier: 'act',
    policy: scopePolicy,
    keywords: ['schedule', 'run now', 'launch'],
  },
} as const satisfies Record<string, OperationDefinition>;
