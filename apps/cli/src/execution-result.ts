import type {
  OperationExecution,
  OperationId,
  operations,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { z } from 'zod';
import { readControlBlob } from './control-blob';

type OperationResult = z.output<(typeof operations)[OperationId]['result']>;

type OperationResponse = OperationResult | OperationExecution;

const isExecution = (value: OperationResponse): value is OperationExecution =>
  value !== null && 'kind' in value && value.kind === 'operation_execution';

export function completeExecutionResult(
  value: OperationExecution,
  deadline: number,
): Promise<OperationExecution>;
export function completeExecutionResult(
  value: OperationResponse,
  deadline: number,
): Promise<OperationResponse>;
export async function completeExecutionResult(
  value: OperationResponse,
  deadline: number,
): Promise<OperationResponse> {
  return isExecution(value) ? fullExecutionResult(value, deadline) : value;
}

async function fullExecutionResult(
  value: OperationExecution,
  deadline: number,
): Promise<OperationExecution> {
  if (!value.fullResult) return value;
  const result: Json = await readControlBlob(value.fullResult, deadline);

  return { ...value, result };
}

export function operationExitCode(value: OperationResponse): number {
  return isExecution(value) ? executionExitCode(value) : 0;
}

export function executionExitCode(result: OperationExecution): number {
  const waitingExitCode = 75;

  return result.status === 'settled' ? 0 : waitingExitCode;
}
