import type { OperationExecution } from '@repo/contracts/operations';
import type { readSessionOperation } from '../sessions';

export function operationExecution(
  id: string,
  value: ReturnType<typeof readSessionOperation>,
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
  value: ReturnType<typeof readSessionOperation>,
): Pick<OperationExecution, 'result' | 'fullResult'> {
  const output: Pick<OperationExecution, 'result' | 'fullResult'> = {};

  if (value.result !== undefined) output.result = value.result;

  if (value.fullResult) output.fullResult = value.fullResult;

  return output;
}
