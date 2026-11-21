import { z } from 'zod';
import { sessionColumns } from '../columns';
import type { OperationDefinition } from './index';

const maxArguments = 2000;

const confirmation = z.strictObject({});

export const delegatedSkillOperations = {
  'session.offerSkill': {
    id: 'session.offerSkill',
    label: 'Offer native skill invocation',
    icon: 'message',
    description: 'Offer a native skill command in a Started Session.',
    params: z.strictObject({
      sessionId: sessionColumns.shape.id,
      starterId: sessionColumns.shape.id.optional(),
      name: z.string().regex(/^[\w:.-]{1,100}$/),
      arguments: z
        .string()
        .max(maxArguments)
        .regex(/^[^\r\n]*$/)
        .default(''),
    }),
    result: confirmation,
    tier: 'act',
    policy: 'allow',
    keywords: ['skill', 'delegate'],
  },
  'session.confirmSkill': {
    id: 'session.confirmSkill',
    label: 'Answer a delegated skill offer',
    icon: 'message',
    description:
      'Submit or skip the offered native slash command in this Session.',
    params: z.strictObject({
      sessionId: sessionColumns.shape.id,
      offerId: z.string(),
      decision: z.enum(['run', 'skip']).default('run'),
    }),
    result: confirmation,
    tier: 'act',
    policy: 'person-only',
    keywords: ['skill', 'delegate'],
  },
} as const satisfies Record<string, OperationDefinition>;
