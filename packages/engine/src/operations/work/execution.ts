import type { OperationExecution } from '@repo/contracts/operations';
import type { OperationCallRead } from '../../sessions';
import type { WaitId } from './ids';

// An execution this Engine built, so its id is a wait id it signed.
export type WorkExecution = OperationExecution & { id: WaitId };

// Everything an execution says beyond its kind and wait id.
type ExecutionState = Omit<OperationExecution, 'kind' | 'id'>;

// A Tool call that has not failed: a failed one ends its wait with its error instead.
export type AnsweredCall = Exclude<OperationCallRead, { status: 'failed' }>;

// The one place an execution is built: its wait id and what its work says now.
export function workExecution(
  id: WaitId,
  state: ExecutionState,
): WorkExecution {
  return { kind: 'operation_execution', id, ...state };
}

export function callExecution(id: WaitId, call: AnsweredCall): WorkExecution {
  return workExecution(id, callState(call));
}

function callState(call: AnsweredCall): ExecutionState {
  if (call.status === 'completed') return completedState(call);

  return call.status === 'cancelled'
    ? { status: 'settled', cancelled: true }
    : { status: call.status };
}

function completedState({
  result,
  fullResult,
}: Extract<AnsweredCall, { status: 'completed' }>): ExecutionState {
  return fullResult
    ? { status: 'settled', result, fullResult }
    : { status: 'settled', result };
}
