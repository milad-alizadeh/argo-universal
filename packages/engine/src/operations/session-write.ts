import { operations, type OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { z } from 'zod';
import type { SessionOperationCall } from '../sessions';
import type {
  OperationImplementations,
  OperationResult,
  OperationsDeps,
} from './operations';
import { operationParams } from './params';
import { runOperation } from './router.gen';
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
  implementations: OperationImplementations,
  context: SessionWrite,
): Promise<OperationResult> {
  const { caller, operation, call, starts } = context;
  const { id } = operation;

  if (id === 'session.new')
    return runSessionStart({ deps, caller, call, starts }, operation.params);

  if (id === 'session.prompt')
    return runSessionPrompt({ deps, caller, call, starts }, operation.params);

  return runScopedWrite(deps, implementations, context);
}

async function runScopedWrite(
  deps: OperationsDeps,
  implementations: OperationImplementations,
  { caller, operation, call }: SessionWrite,
): Promise<OperationResult> {
  const { id } = operation;
  const params = parsedParams(operation);

  if (requiresConfirmation(deps, caller, { id, params }))
    await call.confirm(operations[id].description);

  return operations[id].result.parseAsync(
    await runOperation(implementations, id, params),
  );
}

function requiresConfirmation(
  deps: Pick<OperationsDeps, 'readSession'>,
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
