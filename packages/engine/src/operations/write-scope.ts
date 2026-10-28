import { operations, type OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { z } from 'zod';
import type { OperationsDeps } from './operations';
import { operationParams } from './params';
import type { SessionCaller } from './session-tokens';

type ActOperationId = {
  [Id in OperationId]: (typeof operations)[Id]['tier'] extends 'act'
    ? Id
    : never;
}[OperationId];

type ActTarget = { sessionId: string; projectId: string };

export function isActOperation(id: OperationId): id is ActOperationId {
  return operations[id].tier === 'act';
}

const sessionParams = {
  'session.cancel': operations['session.cancel'].params,
  'session.close': operations['session.close'].params,
  'session.rename': operations['session.rename'].params,
  'session.setConfigOption': operations['session.setConfigOption'].params,
  'session.savePlan': operations['session.savePlan'].params,
  'shell.stop': operations['shell.stop'].params,
} satisfies Record<ActOperationId, z.ZodType<{ sessionId: string }>>;

export function actTarget(
  deps: Pick<OperationsDeps, 'readSession'>,
  operation: { id: ActOperationId; params: Json },
): ActTarget {
  const { sessionId } = operationParams(
    sessionParams[operation.id],
    operation.params,
  );

  return { sessionId, projectId: deps.readSession(sessionId).projectId };
}

// Operation-started Sessions extend this scope when delegation provenance is added.
export function ownsActTarget(
  caller: SessionCaller,
  target: ActTarget,
): boolean {
  return (
    caller.sessionId === target.sessionId &&
    caller.projectId === target.projectId
  );
}
