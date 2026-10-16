import { z } from 'zod';
import { sessionColumns, turnColumns } from '../columns';
import { SubagentState } from '../feed/session-update';
import { TurnUsage } from './turn';

// A read-only child Session; metrics describe its latest Turn, never a sum with its parent's tokens.
export const Subagent = z.strictObject({
  sessionId: sessionColumns.shape.id,
  parentSessionId: sessionColumns.shape.parentSessionId.unwrap(),
  toolCallId: z.string().nullable(),
  title: sessionColumns.shape.title,
  role: z.string().nullable(),
  model: turnColumns.shape.model,
  // ACP idle belongs in Finished; running and requires_action remain unfinished.
  state: SubagentState,
  stopReason: turnColumns.shape.stopReason,
  startedAt: turnColumns.shape.startedAt.nullable(),
  endedAt: turnColumns.shape.endedAt,
  durationMs: z.int().nullable(),
  tokens: TurnUsage.shape.totalTokens.nullable(),
});

export type Subagent = z.infer<typeof Subagent>;

export const SessionSubagentsInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
});

export type SessionSubagentsInput = z.infer<typeof SessionSubagentsInput>;

export const SessionSubagentsOutput = z.array(Subagent);

export type SessionSubagentsOutput = z.infer<typeof SessionSubagentsOutput>;
