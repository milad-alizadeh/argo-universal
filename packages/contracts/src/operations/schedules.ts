import { z } from 'zod';
import { SessionPromptInput } from '../sessions/prompt';
import type { OperationDefinition } from './index';

const askOutsideProject = 'ask-outside-project';

const scheduleTarget = SessionPromptInput.pick({ sessionId: true });

const schedulePrompt = SessionPromptInput.pick({
  sessionId: true,
  prompt: true,
});

const lastDate = 8_640_000_000_000_000;

const maximumIntervalSeconds = 8_640_000_000_000;

const time = z.int().positive().max(lastDate);

const intervalSeconds = z.int().positive().max(maximumIntervalSeconds);

const scheduleInput = schedulePrompt
  .extend({
    intervalSeconds: intervalSeconds
      .describe('Interval cadence in seconds')
      .optional(),
    onceAt: time.describe('One-time delivery in Unix milliseconds').optional(),
    endsAt: time
      .describe(
        'Interval end in Unix milliseconds. Defaults to 24 hours after creation.',
      )
      .optional(),
  })
  .refine(
    ({ intervalSeconds, onceAt }) =>
      (intervalSeconds === undefined) !== (onceAt === undefined),
    'Specify either intervalSeconds or onceAt',
  )
  .refine(
    ({ prompt }) =>
      prompt.some((block) => block.type !== 'text' || block.text.trim()),
    'Enter a Prompt',
  )
  .refine(
    ({ onceAt, endsAt }) => onceAt === undefined || endsAt === undefined,
    'Only Interval follow-ups have an end time',
  );

const schedule = schedulePrompt.extend({
  id: z.string(),
  intervalSeconds: intervalSeconds.nullable(),
  nextAt: time,
  endsAt: time.nullable(),
  lastQueuedAt: z.number().nullable(),
  paused: z.boolean(),
  state: z.enum(['active', 'paused', 'completed', 'expired']),
});

export const scheduleOperations = {
  'session.schedulePrompt': {
    id: 'session.schedulePrompt',
    label: 'Schedule Prompt',
    icon: 'message',
    description:
      'Schedule a follow-up in an existing Session. Use onceAt for Once or intervalSeconds for Interval. Ask which Session or Project to use when the destination is unclear. Confirm the saved Prompt, Session and next occurrence after saving.',
    params: scheduleInput,
    result: schedule,
    tier: 'act',
    policy: askOutsideProject,
    keywords: ['schedule', 'recurring'],
  },
  'session.listSchedules': {
    id: 'session.listSchedules',
    label: 'List Schedules',
    icon: 'checklist',
    description: 'List Schedules and their last delivery times.',
    params: scheduleTarget,
    result: z.array(schedule),
    tier: 'read',
    policy: askOutsideProject,
    keywords: ['schedule'],
  },
  'session.manageSchedule': {
    id: 'session.manageSchedule',
    label: 'Manage Schedule',
    icon: 'checklist',
    description:
      'Manage a Session follow-up. Pause, resume, delete or change its end time.',
    params: scheduleTarget
      .extend({
        id: z.string(),
        action: z.enum(['pause', 'resume', 'delete', 'setEnd']),
        endsAt: time
          .describe('New Interval end in Unix milliseconds')
          .optional(),
      })
      .refine(
        ({ action, endsAt }) =>
          (action === 'setEnd') === (endsAt !== undefined),
        'Provide endsAt when changing the end time',
      ),
    result: z.strictObject({}),
    tier: 'act',
    policy: askOutsideProject,
    keywords: ['schedule'],
  },
} as const satisfies Record<string, OperationDefinition>;
