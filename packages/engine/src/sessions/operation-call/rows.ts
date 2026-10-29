import type { FeedUpdate } from '@repo/contracts';
import type { OperationWorkTarget } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';

// The Operation a Session called, as its Tool call shows it.
export type CalledOperation = { name: string; label: string; input: Json };

export type CallResult = { output: Json } | { error: string };

export type OperationRow = Extract<
  FeedUpdate,
  { sessionUpdate: 'tool_call_update' }
>;

// The one Feed row id of an Operation Tool call; reading the call back uses it too.
export const operationRowId = (toolCallId: string): string =>
  `argo:${toolCallId}`;

export const openRow = (
  toolCallId: string,
  operation: CalledOperation,
): OperationRow => ({
  id: operationRowId(toolCallId),
  sessionUpdate: 'tool_call_update',
  state: 'open',
  toolCallId,
  title: operation.label,
  name: operation.name,
  kind: 'other',
  status: 'in_progress',
  content: [],
  rawInput: operation.input,
});

export const settledRow = (
  row: OperationRow,
  result: CallResult,
): OperationRow => ({
  ...row,
  state: 'settled',
  status: 'error' in result ? 'failed' : 'completed',
  rawOutput: 'error' in result ? { error: result.error } : result.output,
});

export const cancelledRow = (row: OperationRow): OperationRow => ({
  ...row,
  state: 'settled',
  status: 'cancelled',
});

export const startedRow = (
  row: OperationRow,
  work: OperationWorkTarget,
): OperationRow => ({ ...row, _meta: { argo: { operationWork: work } } });
