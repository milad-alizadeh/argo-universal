import type { OperationExecution } from '@repo/contracts/operations';
import type { OperationCallRead } from '../../sessions';

// Everything an execution says beyond its kind and wait id.
type ExecutionState = Omit<OperationExecution, 'kind' | 'id'>;

// A Tool call that has not failed: a failed one ends its wait with its error instead.
export type AnsweredCall = Exclude<OperationCallRead, { status: 'failed' }>;

// The one place an execution is built: its wait id and what its work says now.
export function workExecution(
  id: string,
  state: ExecutionState,
): OperationExecution {
  return { kind: 'operation_execution', id, ...state };
}

export function callExecution(
  id: string,
  call: AnsweredCall,
): OperationExecution {
  return workExecution(id, callState(call));
}

function callState(call: AnsweredCall): ExecutionState {
  switch (call.status) {
    case 'completed':
      return call.fullResult
        ? {
            status: 'settled',
            result: call.result,
            fullResult: call.fullResult,
          }
        : { status: 'settled', result: call.result };
    case 'cancelled':
      return { status: 'settled', cancelled: true };
    default:
      return { status: call.status };
  }
}
