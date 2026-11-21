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
