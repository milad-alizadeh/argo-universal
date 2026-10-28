import type {
  OperationExecution,
  OperationId,
} from '@repo/contracts/operations';
import type { StartedOperation } from './call-recording';
import { isNativeStartOperation } from './native-start';
import type { OperationRunResult } from './operations';
import type { OperationCaller } from './session-tokens';
import type { WaitBudget } from './wait-budget';
import type { WorkObservation } from './work-observation';

export type RunObservation = {
  caller: OperationCaller;
  token?: string;
  wait: boolean;
  signal?: AbortSignal;
  id: OperationId;
};

export type RunContext = { input: RunObservation; budget: WaitBudget };

export type ObserveOptions = {
  signal?: AbortSignal;
  stopOnInput?: boolean;
  limitMs?: number;
};

export type StartOperation = (
  budget: WaitBudget,
) => StartedOperation<OperationRunResult>;

export function operationResponse(
  id: OperationId,
  result: Promise<OperationRunResult>,
  observed: Promise<OperationExecution>,
): Promise<OperationRunResult> {
  const completed = observed.then((value) => completedOrPending(value, result));

  const primary = isNativeStartOperation(id)
    ? result.then(() => completed)
    : result;

  return Promise.race([primary, completed]);
}

async function completedOrPending(
  value: OperationExecution,
  result: Promise<OperationRunResult>,
): Promise<OperationRunResult> {
  if (value.status !== 'settled') return value;

  return nativeOrOriginal(value, result);
}

async function nativeOrOriginal(
  value: OperationExecution,
  result: Promise<OperationRunResult>,
): Promise<OperationRunResult> {
  if (value.cancelled) return value;

  return value.id.startsWith('call:') ? result : value;
}

// A cancelled in-flight Tool call may return only its native cancellation after the caller closes.
export function recordedCaller(
  caller: OperationCaller,
  authorize: () => OperationCaller,
  read: () => WorkObservation,
): OperationCaller {
  try {
    return authorize();
  } catch (cause) {
    if (!cancelledCall(read)) throw cause;

    return caller;
  }
}

function cancelledCall(read: () => WorkObservation): boolean {
  try {
    return read().execution.cancelled === true;
  } catch {
    return false;
  }
}
