import {
  discoveryOperation,
  operations,
  type OperationId,
} from '@repo/contracts/operations';
import { ChartPreviewCapturedResult } from '@repo/contracts/operations/chart';
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

// A captured screen is for the one reader that asked: its Tool call says one was taken and never holds the picture.
const shownScreenshot = (result: OperationResult): Json => {
  const capture = operations['app.screenshot'].result.safeParse(result);

  return capture.data?.status === 'captured'
    ? { status: 'captured' }
    : wireJson(result);
};

const shownChartPreview = (result: OperationResult): Json =>
  ChartPreviewCapturedResult.safeParse(result).success
    ? { valid: true, status: 'captured' }
    : wireJson(result);

// What an Operation's Tool call shows of its result where that is less than the whole of it; the rest show their own result.
const shownBy: Partial<Record<OperationId, (result: OperationResult) => Json>> =
  { 'app.screenshot': shownScreenshot, 'chart.preview': shownChartPreview };

// A Session's Tool call shows the Operation's own result, as its Operation says it may.
export const recordedOutput =
  (id: OperationId) =>
  (value: OperationRunResult): Json =>
    value.kind === 'result'
      ? (shownBy[id] ?? wireJson)(value.result)
      : wireJson(value);

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
