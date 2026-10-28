import type { OperationExecution } from '@repo/contracts/operations';
import type { OperationCallRead } from '../sessions';

export function operationExecution(
  id: string,
  value: OperationCallRead,
): OperationExecution {
  const execution: OperationExecution = {
    kind: 'operation_execution',
    id,
    status: value.status,
    ...callOutput(value),
  };

  if (value.cancelled) execution.cancelled = true;

  return execution;
}

function callOutput(
  value: OperationCallRead,
): Pick<OperationExecution, 'result' | 'fullResult'> {
  const output: Pick<OperationExecution, 'result' | 'fullResult'> = {};

  if (value.result !== undefined) output.result = value.result;

  if (value.fullResult) output.fullResult = value.fullResult;

  return output;
}
