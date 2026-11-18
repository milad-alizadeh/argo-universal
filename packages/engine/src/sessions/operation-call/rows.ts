import type { FeedUpdate } from '@repo/contracts';
import type { IconName } from '@repo/contracts/kit-symbols';
import {
  operationFeedRowId,
  type OperationWorkTarget,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';

// The Operation a Session called, as its Tool call shows it.
export type CalledOperation = {
  name: string;
  label: string;
  input: Json;
  icon?: IconName;
};

export type CallResult = { output: Json } | { error: string };

export type OperationRow = Extract<
  FeedUpdate,
  { sessionUpdate: 'tool_call_update' }
>;

// The one Feed row id of an Operation Tool call; reading the call back uses it too.
export const operationRowId = operationFeedRowId;

export const openRow = (
  toolCallId: string,
  operation: CalledOperation,
): OperationRow => ({
  id: operationRowId(toolCallId),
  sessionUpdate: 'tool_call_update',
  state: 'open',
  toolCallId,
  kind: 'other',
  status: 'in_progress',
  content: [],
  ...operationFields(operation),
});

type OperationFields = Pick<
  OperationRow,
  'title' | 'name' | 'rawInput' | '_meta'
>;

function operationFields({
  icon,
  label,
  name,
  input,
}: CalledOperation): OperationFields {
  return {
    title: label,
    name,
    rawInput: input,
    ...(icon && { _meta: { argo: { operationIcon: icon } } }),
  };
}

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
): OperationRow => ({
  ...row,
  _meta: { ...row._meta, argo: { ...row._meta?.argo, operationWork: work } },
});
