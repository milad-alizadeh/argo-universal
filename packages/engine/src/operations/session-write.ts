import { operations, type OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { z } from 'zod';
import type { SessionOperationCall } from '../sessions';
import type { OperationResult, SessionInvoke } from './implementations';
import type { OperationsDeps } from './operations';
import { operationParams } from './params';
import { runSessionPrompt } from './session-prompt';
import { runSessionStart } from './session-start';
import type { SessionStarts } from './session-starts';
import type { SessionCaller } from './session-tokens';
import { actTarget, isActOperation, ownsActTarget } from './write-scope';

type SessionWrite = {
  caller: SessionCaller;
  operation: { id: OperationId; params: Json };
  call: SessionOperationCall;
  starts: SessionStarts;
};

export async function runSessionWrite(
  deps: OperationsDeps,
  invoke: SessionInvoke,
  context: SessionWrite,
): Promise<OperationResult> {
  const { caller, operation, call, starts } = context;
  const start = { deps, caller, call, starts, invoke };

  if (operation.id === 'session.new')
    return runSessionStart(start, operation.params);

  if (operation.id === 'session.prompt')
    return runSessionPrompt(start, operation.params);

  return runScopedWrite(deps, invoke, context);
}

async function runScopedWrite(
  deps: OperationsDeps,
  invoke: SessionInvoke,
  { caller, operation, call }: SessionWrite,
): Promise<OperationResult> {
  const { id } = operation;
  const params = parsedParams(operation);

  if (requiresConfirmation(deps, caller, { id, params }))
    await call.confirm(operations[id].description);

  return invoke({ id, params });
}

function requiresConfirmation(
  deps: OperationsDeps,
  caller: SessionCaller,
  operation: SessionWrite['operation'],
): boolean {
  if (isActOperation(operation.id))
    return !ownsActTarget(
      caller,
      actTarget(deps, { ...operation, id: operation.id }),
    );

  return operations[operation.id].tier === 'confirm';
}

function parsedParams({ id, params }: SessionWrite['operation']): Json {
  return z.json().parse(operationParams(operations[id].params, params));
}
