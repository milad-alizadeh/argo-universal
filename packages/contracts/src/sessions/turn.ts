import { stopReasons } from '@repo/db/schema';
import { z } from 'zod';
import { turnColumns } from '../columns';

export const StopReason = z.enum(stopReasons);

export type StopReason = z.infer<typeof StopReason>;

// ACP `Error`, the error a Turn ended with.
export const TurnError = z.strictObject({
  code: z.union([z.int(), z.literal('interrupted')]),
  message: z.string(),
  data: z.unknown().optional(),
});

export type TurnError = z.infer<typeof TurnError>;

// Counters reported at Turn completion; scope qualifies the total.
export const TurnUsage = z.strictObject({
  scope: z.enum(['turn', 'model-call', 'agent-reported']).optional(),
  totalTokens: z.int(),
  inputTokens: z.int(),
  outputTokens: z.int(),
  thoughtTokens: z.int().optional(),
  cachedReadTokens: z.int().optional(),
  cachedWriteTokens: z.int().optional(),
});

export type TurnUsage = z.infer<typeof TurnUsage>;

// The `turn` table's columns, times in Unix milliseconds; `error` and `usage` are typed JSON, null in a row and optional in the spec.
export const Turn = z.strictObject({
  ...turnColumns.omit({ error: true, usage: true }).shape,
  error: TurnError.nullish(),
  usage: TurnUsage.nullish(),
});

export type Turn = z.infer<typeof Turn>;

// App-visible ending; duration is elapsed milliseconds, including time awaiting input.
export const TurnEnd = z.strictObject({
  stopReason: turnColumns.shape.stopReason.unwrap(),
  error: TurnError.nullable(),
  durationMs: z.number(),
  // The user denied a Permission request and the Agent then ended the Turn as cancelled; absent otherwise, and never set by a Stop.
  permissionDenied: z.literal(true).optional(),
});

export type TurnEnd = z.infer<typeof TurnEnd>;
