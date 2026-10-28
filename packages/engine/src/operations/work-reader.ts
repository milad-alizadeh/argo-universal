import type { OperationExecution } from '@repo/contracts/operations';
import { readSessionOperation } from '../sessions';
import type { OperationsDeps } from './operations';
import type { NativeWork } from './wait-id';

export function readOperationWork(
  deps: OperationsDeps,
  id: string,
  work: NativeWork,
): OperationExecution {
  if (work.kind !== 'call') throw new Error('Turn waits are not available yet');
  const value = readSessionOperation(deps, work.sessionId, work.entityId);

  if (value.error) throw new Error(value.error);

  return operationExecution(id, value);
}

function operationExecution(
  id: string,
  value: ReturnType<typeof readSessionOperation>,
): OperationExecution {
  const execution: OperationExecution = {
    kind: 'operation_execution',
    id,
    status: value.status,
  };

  if (value.result !== undefined) execution.result = value.result;

  if (value.cancelled) execution.cancelled = true;

  return execution;
}
