import { SessionNewInput, SessionPromptInput } from '@repo/contracts';
import type {
  OperationExecution,
  OperationId,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { TRPCError } from '@trpc/server';
import {
  startSessionCreation,
  promptSessionAccepted,
  type AcceptedSessionPrompt,
} from '../sessions';
import type { OperationsDeps, OperationRunResult } from './operations';
import { operationParams } from './params';
import { admissionTimedOut, type WaitBudget } from './wait-budget';
import type { NativeWork, WaitIds } from './wait-id';
import { readOperationWork } from './work-reader';

type NativeStartId = 'session.new' | 'session.prompt';

export type NativeUserStart = { id: NativeStartId; params: Json };

type StartContext = { deps: OperationsDeps; ids: WaitIds; budget: WaitBudget };

type AdmissionFailure = { cause: unknown };

export function isNativeStartOperation(id: OperationId): id is NativeStartId {
  return id === 'session.new' || id === 'session.prompt';
}

export function startUserNativeWork(
  context: StartContext,
  { id, params }: NativeUserStart,
): Promise<OperationRunResult> {
  return id === 'session.new'
    ? startCreation(context, params)
    : startPrompt(context, params);
}

async function startCreation(
  context: StartContext,
  params: Json,
): Promise<OperationExecution> {
  const input = operationParams(SessionNewInput, params);

  const creation = await context.budget.guard((signal) =>
    startSessionCreation(admissionDeps(context.deps, signal), input),
  );

  return nativeExecution(context, {
    kind: 'creation',
    sessionId: creation.sessionId,
    entityId: creation.turnId,
  });
}

async function startPrompt(
  context: StartContext,
  params: Json,
): Promise<OperationRunResult> {
  const input = operationParams(SessionPromptInput, params);

  const work: NativeWork = {
    kind: 'turn',
    sessionId: input.sessionId,
    entityId: context.deps.createId(),
  };

  const admitted = await admitPrompt(context, input, work);

  return promptExecution(context, work, admitted);
}

function promptExecution(
  context: StartContext,
  work: NativeWork,
  admitted: AcceptedSessionPrompt | OperationExecution,
): OperationRunResult {
  if ('kind' in admitted) return admitted;

  if (admitted.messageId === null) return admitted;

  return nativeExecution(context, { ...work, entityId: admitted.turnId });
}

function expiredPrompt(
  context: StartContext,
  work: NativeWork,
): OperationExecution {
  try {
    return nativeExecution(context, work);
  } catch (cause) {
    return missingAdmission({ cause });
  }
}

function missingAdmission({ cause }: AdmissionFailure): never {
  if (!(cause instanceof TRPCError)) throw cause;

  if (cause.code !== 'NOT_FOUND') throw cause;

  return admissionTimedOut();
}

function nativeExecution(
  { deps, ids }: StartContext,
  work: NativeWork,
): OperationExecution {
  const caller = { kind: 'user' as const };

  return readOperationWork(
    { deps, ids, caller },
    { id: ids.issue(caller, work), work },
  ).execution;
}

function admissionDeps(
  deps: OperationsDeps,
  signal: AbortSignal,
): OperationsDeps {
  const sessionCommandSignal = deps.sessionCommandSignal
    ? AbortSignal.any([deps.sessionCommandSignal, signal])
    : signal;

  return { ...deps, sessionCommandSignal };
}

function admitPrompt(
  context: StartContext,
  input: SessionPromptInput,
  work: NativeWork,
): Promise<AcceptedSessionPrompt | OperationExecution> {
  return context.budget.guard<AcceptedSessionPrompt | OperationExecution>(
    promptAdmission(context.deps, input, work),
    () => expiredPrompt(context, work),
  );
}

function promptAdmission(
  deps: OperationsDeps,
  input: SessionPromptInput,
  work: NativeWork,
): (signal: AbortSignal) => Promise<AcceptedSessionPrompt> {
  return (signal: AbortSignal) =>
    promptSessionAccepted(
      {
        ...admissionDeps(deps, signal),
        createId: () => work.entityId,
      },
      input,
    );
}
