import { z } from 'zod';
import { SessionSubmitInput, SessionQueueInput } from '../sessions';
import type { OperationDefinition } from './index';

export const queueOperations = {
  'session.submit': {
    id: 'session.submit',
    label: 'Submit Prompt',
    icon: 'message',
    description:
      'Submit a user Prompt from an App, queuing it while the Session is busy or paused.',
    params: SessionSubmitInput,
    result: z.strictObject({}),
    tier: 'act',
    keywords: ['prompt', 'queue'],
  },
  'session.queue': {
    id: 'session.queue',
    label: 'Manage Prompt queue',
    icon: 'checklist',
    description: 'Append, edit, delete, reorder or resume Queued Prompts.',
    params: SessionQueueInput,
    result: z.strictObject({}),
    tier: 'act',
    keywords: ['queue', 'prompt'],
  },
} as const satisfies Record<string, OperationDefinition>;
