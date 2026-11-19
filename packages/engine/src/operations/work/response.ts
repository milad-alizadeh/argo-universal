import type { OperationId } from '@repo/contracts/operations';
import { z } from 'zod';
import type { OperationRunResult } from '../implementations';
import { isNativeStartOperation } from '../native-start';
import type { SessionCaller, TokenCaller } from '../session-tokens';
import type { ObservationOptions } from './clock';
import type { WorkExecution } from './execution';
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

function completedOrPending(
  value: WorkObservation,
  result: Promise<OperationRunResult>,
): Promise<OperationRunResult> {
  if (value.work.kind === 'turn') return withAnswer(value.execution, result);

  return callAnswer(value, result);
}

// A Session opening answers as it reads; a settled Tool call answers with the Operation's own result.
async function callAnswer(
  { execution, work }: WorkObservation,
  result: Promise<OperationRunResult>,
): Promise<OperationRunResult> {
  if (work.kind !== 'call' || !settledAnswer(execution)) return execution;

  return result;
}

const settledAnswer = ({ status, cancelled }: WorkExecution): boolean =>
  status === 'settled' && cancelled !== true;

const JsonObject = z.record(z.string(), z.json());

type JsonObject = z.infer<typeof JsonObject>;

// A Turn is linked once its Operation answered, so its execution also says what that answer was.
async function withAnswer(
  execution: WorkExecution,
  result: Promise<OperationRunResult>,
): Promise<OperationRunResult> {
  if (execution.cancelled) return execution;

  return withResult(execution, await result);
}

const resultObject = (
  answer: OperationRunResult,
): z.ZodSafeParseResult<JsonObject> =>
  JsonObject.safeParse(answer.kind === 'result' ? answer.result : null);

function withResult(
  execution: WorkExecution,
  answer: OperationRunResult,
): WorkExecution {
  const answered = resultObject(answer);
  const own = JsonObject.safeParse(execution.result);

  if (!answered.success || !own.success) return execution;

  return { ...execution, result: { ...own.data, ...answered.data } };
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
