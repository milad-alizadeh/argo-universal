import type { OperationExecution, OperationId } from '@repo/contracts/operations';
import type { OperationRunResult } from './operations';
import { isNativeStartOperation } from './native-user-starts';

export function operationResponse(id: OperationId, result: Promise<OperationRunResult>, observed: Promise<OperationExecution>): Promise<OperationRunResult> {
  const completed = observed.then((value) => completedOrPending(value, result));
  const primary = isNativeStartOperation(id) ? result.then(() => completed) : result;
  return Promise.race([primary, completed]);
}

async function completedOrPending(value: OperationExecution, result: Promise<OperationRunResult>): Promise<OperationRunResult> {
  if (value.status !== 'settled') return value;
  return nativeOrOriginal(value, result);
}

async function nativeOrOriginal(value: OperationExecution, result: Promise<OperationRunResult>): Promise<OperationRunResult> {
  if (value.cancelled) return value;
  return value.id.startsWith('call:') ? result : value;
}
