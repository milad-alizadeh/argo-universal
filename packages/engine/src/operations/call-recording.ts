import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  beginSessionOperation,
  type SessionOperationCall,
  type SessionRouterDeps,
} from '../sessions';
import type { OperationCaller } from './session-tokens';

type Recording = {
  deps: Pick<SessionRouterDeps, 'sessions'>;
  caller: OperationCaller;
};

type Call = { name: string; label: string; input: Json };

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
  { deps, caller }: Recording,
  operation: Call,
  run: (call?: SessionOperationCall) => Promise<Result>,
): Promise<Result> {
  return startRecordedOperation({ deps, caller }, operation, run).result;
}

export function startRecordedOperation<Result>(
  { deps, caller }: Recording,
  operation: Call,
  run: (call?: SessionOperationCall) => Promise<Result>,
): { call?: SessionOperationCall; result: Promise<Result> } {
  if (caller.kind === 'user') return { result: run() };

  const call = beginSessionOperation(
    deps.sessions,
    caller.sessionId,
    operation,
  );
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
