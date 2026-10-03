import { z } from 'zod';

export const StopReason = z.enum([
  'end_turn',
  'max_tokens',
  'max_turn_requests',
  'refusal',
  'cancelled',
  'error',
]);
export type StopReason = z.infer<typeof StopReason>;

export const TurnStatus = z.enum(['running', 'ended']);
export type TurnStatus = z.infer<typeof TurnStatus>;

// ACP `Error`, the error a Turn ended with.
export const TurnError = z.strictObject({
  code: z.int(),
  message: z.string(),
  data: z.unknown().optional(),
});
export type TurnError = z.infer<typeof TurnError>;

// ACP `Usage`: tokens one Turn used.
export const TurnUsage = z.strictObject({
  totalTokens: z.int().nonnegative(),
  inputTokens: z.int().nonnegative(),
  outputTokens: z.int().nonnegative(),
  thoughtTokens: z.int().nonnegative().optional(),
  cachedReadTokens: z.int().nonnegative().optional(),
  cachedWriteTokens: z.int().nonnegative().optional(),
});
export type TurnUsage = z.infer<typeof TurnUsage>;

export const Turn = z.strictObject({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  status: TurnStatus,
  stopReason: StopReason.nullable(),
  error: TurnError.optional(),
  usage: TurnUsage.optional(),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime().nullable(),
});
export type Turn = z.infer<typeof Turn>;
