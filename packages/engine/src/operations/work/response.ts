import type { OperationId } from '@repo/contracts/operations';
import type { OperationRunResult } from '../implementations';
import { isNativeStartOperation } from '../native-start';
import type { SessionCaller, TokenCaller } from '../session-tokens';
import type { ObservationOptions } from './clock';
import type { WorkObservation } from './observation';

// A Session caller's run: its Tool call observes the work it starts.
export type SessionObservation = ObservationOptions & {
  caller: SessionCaller;
  token?: string;
  wait: boolean;
  id: OperationId;
};

// A Session caller gets its Operation's result, or what its Tool call observed first.
export function operationResponse(
  id: OperationId,
  result: Promise<OperationRunResult>,
  observed: Promise<WorkObservation>,
): Promise<OperationRunResult> {
  const completed = observed.then((value) => completedOrPending(value, result));

  const primary = isNativeStartOperation(id)
    ? result.then(() => completed)
    : result;

  return Promise.race([primary, completed]);
}

async function completedOrPending(
  value: WorkObservation,
  result: Promise<OperationRunResult>,
): Promise<OperationRunResult> {
  if (value.execution.status !== 'settled') return value.execution;

  return nativeOrOriginal(value, result);
}

// A settled Tool call answers with the Operation's own result; native work answers with its execution.
async function nativeOrOriginal(
  { execution, work }: WorkObservation,
  result: Promise<OperationRunResult>,
): Promise<OperationRunResult> {
  if (execution.cancelled) return execution;

  return work.kind === 'call' ? result : execution;
}

// A cancelled in-flight Tool call may return only its native cancellation after the caller closes.
export function recordedCaller(
  caller: SessionCaller,
  authorize: () => TokenCaller,
  read: () => WorkObservation,
): TokenCaller {
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
