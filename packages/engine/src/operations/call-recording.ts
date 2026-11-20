import {
  AppScreenshotResult,
  discoveryOperation,
  operations,
  type OperationId,
  type OperationRow,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { CalledOperation, SessionOperationCall } from '../sessions';
import type { OperationResult, OperationRunResult } from './implementations';
import { wireJson } from './wire-json';

// A Session's Operation, shown as its Tool call until its result or failure settles it.
export type RecordedOperation<Result> = {
  call: SessionOperationCall;
  result: Promise<Result>;
};

// Runs the Operation in its Tool call; `output` is what the settled row shows of the result.
export function recordOperation<Result>(
  call: SessionOperationCall,
  run: () => Promise<Result>,
  output: (result: Result) => Json,
): RecordedOperation<Result> {
  const result = Promise.resolve()
    .then(run)
    .then(
      (value) => completed(call, value, output),
      (cause: unknown) => failed(call, cause),
    );

  return { call, result };
}

function completed<Result>(
  call: SessionOperationCall,
  result: Result,
  output: (result: Result) => Json,
): Result {
  call.finish({ output: output(result) });

  return result;
}

function failed(call: SessionOperationCall, cause: unknown): never {
  call.finish({
    error: cause instanceof Error ? cause.message : String(cause),
  });
  throw cause;
}

export const listedOutput = (value: OperationRow[]): Json => wireJson(value);

// A captured screen is for the one reader that asked: its Tool call says one was taken and never holds the picture.
const shownResult = (result: OperationResult): Json => {
  const capture = AppScreenshotResult.safeParse(result);

  return capture.data?.status === 'captured'
    ? { status: 'captured' }
    : wireJson(result);
};

// A Session's Tool call shows the Operation's own result.
export const recordedOutput = (value: OperationRunResult): Json =>
  value.kind === 'result' ? shownResult(value.result) : wireJson(value);

export const discoveryCall = (filter: string): CalledOperation => ({
  name: discoveryOperation.id,
  label: discoveryOperation.label,
  input: { filter },
});

export const operationCall = ({
  id,
  params,
}: {
  id: OperationId;
  params: Json;
}): CalledOperation => ({
  name: id,
  label: operations[id].label,
  input: params,
});
