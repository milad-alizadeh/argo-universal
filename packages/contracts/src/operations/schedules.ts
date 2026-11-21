import { z } from 'zod';
import { SessionPromptInput } from '../sessions/prompt';
import type { OperationDefinition } from './index';

const askOutsideProject = 'ask-outside-project';

const scheduleTarget = SessionPromptInput.pick({ sessionId: true });

const scheduleInput = SessionPromptInput.pick({
  sessionId: true,
  prompt: true,
}).extend({
  intervalSeconds: z.int().positive(),
});

const schedule = scheduleInput.extend({
  id: z.string(),
  nextAt: z.number(),
  lastQueuedAt: z.number().nullable(),
  paused: z.boolean(),
});

export const scheduleOperations = {
  'session.schedulePrompt': {
    id: 'session.schedulePrompt',
    label: 'Schedule Prompt',
    icon: 'message',
    description: 'Send a Prompt to the Session at a fixed interval.',
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
    description: 'Pause, resume or delete a Schedule.',
    params: scheduleTarget.extend({
      id: z.string(),
      action: z.enum(['pause', 'resume', 'delete']),
    }),
    result: z.strictObject({}),
    tier: 'act',
    policy: askOutsideProject,
    keywords: ['schedule'],
  },
} as const satisfies Record<string, OperationDefinition>;
