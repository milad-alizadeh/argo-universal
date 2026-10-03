import { stopReasons, turnStatuses } from '@argo/db/schema';
import { z } from 'zod';
import { turnColumns } from '../columns';

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
  totalTokens: z.int(),
  inputTokens: z.int(),
  outputTokens: z.int(),
  thoughtTokens: z.int().optional(),
  cachedReadTokens: z.int().optional(),
  cachedWriteTokens: z.int().optional(),
});
export type TurnUsage = z.infer<typeof TurnUsage>;

// The `turn` table's columns, times in Unix milliseconds; `error` and `usage` are typed JSON here.
export const Turn = z.strictObject({
  ...turnColumns.omit({ error: true, usage: true }).shape,
  error: TurnError.optional(),
  usage: TurnUsage.optional(),
});
export type Turn = z.infer<typeof Turn>;
