import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { OperationCalls, SessionOperationCall } from '../sessions';
import type { OperationCaller } from './session-tokens';

type Recording = { calls: OperationCalls; caller: OperationCaller };

type Call = { name: string; label: string; input: Json };

export type StartedOperation<Result> = {
  call?: SessionOperationCall;
  result: Promise<Result>;
};

function completed<Result>(call: SessionOperationCall, result: Result): Result {
  call.finish({ output: z.json().parse(result) });

  return result;
}

function failed(call: SessionOperationCall, cause: unknown): never {
  call.finish({
    error: cause instanceof Error ? cause.message : String(cause),
  });
  throw cause;
}

export function recordOperation<Result>(
  recording: Recording,
  operation: Call,
  run: (call?: SessionOperationCall) => Promise<Result>,
): Promise<Result> {
  return startRecordedOperation(recording, operation, run).result;
}

export function startRecordedOperation<Result>(
  { calls, caller }: Recording,
  operation: Call,
  run: (call?: SessionOperationCall) => Promise<Result>,
): StartedOperation<Result> {
  if (caller.kind === 'user') return { result: run() };

  const call = calls.begin(caller.sessionId, operation);

  return { call, result: runRecorded(call, run) };
}

function runRecorded<Result>(
  call: SessionOperationCall,
  run: (call?: SessionOperationCall) => Promise<Result>,
): Promise<Result> {
  return Promise.resolve()
    .then(() => run(call))
    .then(
      (result) => completed(call, result),
      (cause: unknown) => failed(call, cause),
    );
}

export function requireOperationCall(
  call: SessionOperationCall | undefined,
): SessionOperationCall {
  if (call) return call;

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'The calling Session has no Operation Tool call',
  });
}
