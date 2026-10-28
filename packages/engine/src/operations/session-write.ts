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
import type { SessionCaller } from './session-tokens';
import { actTarget, isActOperation, ownsActTarget } from './write-scope';

type SessionWrite = {
  caller: SessionCaller;
  operation: { id: OperationId; params: Json };
  call: SessionOperationCall;
};

export async function runSessionWrite(
  deps: Pick<OperationsDeps, 'readSession'>,
  implementations: OperationImplementations,
  { caller, operation, call }: SessionWrite,
): Promise<OperationResult> {
  const { id } = operation;

  const params = parsedParams(operation);

  const parsed = { id, params };

  if (requiresConfirmation(deps, caller, parsed))
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
