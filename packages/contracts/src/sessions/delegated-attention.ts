import { z } from 'zod';

export const DelegatedInput = z.strictObject({
  sessionId: z.string(),
  requestId: z.string(),
  title: z.string(),
  kind: z.enum(['permission', 'elicitation']),
});

export type DelegatedInput = z.infer<typeof DelegatedInput>;

export const DelegatedSkillOffer = z.strictObject({
  id: z.string(),
  name: z.string(),
  arguments: z.string(),
  starterId: z.string(),
  originTurnId: z.string(),
});

export type DelegatedSkillOffer = z.infer<typeof DelegatedSkillOffer>;

export const DelegatedAttention = z.strictObject({
  requests: z.array(DelegatedInput),
  skills: z.array(DelegatedSkillOffer),
});

export type DelegatedAttention = z.infer<typeof DelegatedAttention>;
