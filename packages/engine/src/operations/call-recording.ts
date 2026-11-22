import {
  discoveryOperation,
  operations,
  type OperationDefinition,
  type OperationId,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { CalledOperation, SessionOperationCall } from '../sessions';
import type { OperationRunResult } from './implementations';
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

// The Operation decides which parts of its answer the Feed may keep.
export const recordedOutput =
  (id: OperationId) =>
  (value: OperationRunResult): Json => {
    if (value.kind !== 'result') return wireJson(value);

    const operation: OperationDefinition = operations[id];

    return (
      operation.imageVisibility?.forToolCall(value.result) ??
      wireJson(value.result)
    );
  };

export const discoveryCall = (
  input: { filter: string } | { id: string },
): CalledOperation => ({
  name: discoveryOperation.id,
  label: discoveryOperation.label,
  input,
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
