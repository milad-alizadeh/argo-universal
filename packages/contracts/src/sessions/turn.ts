import { stopReasons, turn, turnStatuses } from '@argo/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

export const StopReason = z.enum(stopReasons);
export type StopReason = z.infer<typeof StopReason>;

export const TurnStatus = z.enum(turnStatuses);
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

const turnColumns = createSelectSchema(turn, {
  id: (schema) => schema.min(1),
  sessionId: (schema) => schema.min(1),
  startedAt: (schema) => schema.nonnegative(),
  endedAt: (schema) => schema.nonnegative(),
});

// The `turn` table's columns, times in Unix milliseconds; `error` and `usage` are typed JSON here.
export const Turn = z.strictObject({
  ...turnColumns.omit({ error: true, usage: true }).shape,
  error: TurnError.optional(),
  usage: TurnUsage.optional(),
});
export type Turn = z.infer<typeof Turn>;
