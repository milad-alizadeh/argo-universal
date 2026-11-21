import { z } from 'zod';
import { sessionColumns } from '../columns';
import type { OperationDefinition } from './index';

const confirmation = z.strictObject({});

export const delegatedSkillOperations = {
  'session.offerSkill': {
    id: 'session.offerSkill',
    label: 'Offer native skill invocation',
    icon: 'message',
    description:
      'Offer the person a native slash command in a Started Session when they explicitly request that skill.',
    params: z.strictObject({
      sessionId: sessionColumns.shape.id,
      starterId: sessionColumns.shape.id.optional(),
      name: z.string().regex(/^[\w:.-]{1,100}$/),
      arguments: z
        .string()
        .max(2000)
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
    label: 'Run a delegated skill',
    icon: 'message',
    description:
      'Confirm and submit the offered native slash command in this Session.',
    params: z.strictObject({
      sessionId: sessionColumns.shape.id,
      offerId: z.string(),
    }),
    result: confirmation,
    tier: 'act',
    policy: 'person-only',
    keywords: ['skill', 'delegate'],
  },
} as const satisfies Record<string, OperationDefinition>;
