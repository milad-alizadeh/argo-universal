import { OperationExecution } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { readControlBlob } from './control-blob';

export async function completeExecutionResult<Result>(
  value: Result,
  deadline: number,
): Promise<Result | OperationExecution> {
  const execution = OperationExecution.safeParse(value);

  if (!execution.success) return value;

  return fullExecutionResult(execution.data, deadline);
}

async function fullExecutionResult(
  value: OperationExecution,
  deadline: number,
): Promise<OperationExecution> {
  if (!value.fullResult) return value;
  const result: Json = await readControlBlob(value.fullResult, deadline);

  return { ...value, result };
}

export function operationExitCode<Result>(value: Result): number {
  const execution = OperationExecution.safeParse(value);

  return execution.success ? executionExitCode(execution.data) : 0;
}

export function executionExitCode(result: OperationExecution): number {
  const waitingExitCode = 75;

  return result.status === 'settled' ? 0 : waitingExitCode;
}
