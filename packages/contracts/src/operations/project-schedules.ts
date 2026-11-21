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
  intervalSeconds,
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
      'Clarify an ambiguous destination before scheduling fresh Sessions, then confirm the saved instructions, Project and next occurrence.',
    params: ProjectScheduleInput,
    result: ProjectSchedule,
    tier: 'act',
    policy: scopePolicy,
    keywords: ['schedule', 'recurring', 'interval'],
  },
  'project.scheduleList': {
    id: 'project.scheduleList',
    label: 'List Project Schedules',
    icon: scheduleIcon,
    description:
      'List Project Schedules and their next occurrence. A Session caller defaults to its own Project.',
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
      'Update the saved instructions, cadence, Agent or Checkout for future Project Schedule occurrences.',
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
      'Pause, resume or delete a Project Schedule. Sessions already started remain available.',
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
      'Read recent occurrences, Session links, and reasons an occurrence was skipped or failed.',
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
      'Start a fresh Session for a Project Schedule and keep its next scheduled occurrence.',
    params: target,
    result: ProjectScheduleOccurrence,
    tier: 'act',
    policy: scopePolicy,
    keywords: ['schedule', 'run now', 'launch'],
  },
} as const satisfies Record<string, OperationDefinition>;
