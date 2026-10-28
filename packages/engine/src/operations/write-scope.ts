import { operations, type OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { z } from 'zod';
import { readSessionCloseTarget } from '../sessions';
import { isNativeStartOperation, type NativeStartId } from './native-start';
import type { OperationsDeps } from './operations';
import { operationParams } from './params';
import type { SessionCaller } from './session-tokens';

type ActOperationId = {
  [Id in OperationId]: (typeof operations)[Id]['tier'] extends 'act'
    ? Id
    : never;
}[OperationId];

type SessionActOperationId = Exclude<ActOperationId, NativeStartId>;

type ActTarget = {
  sessionId: string;
  projectId: string;
  startedBySessionId: string | null;
};

export function isActOperation(id: OperationId): id is SessionActOperationId {
  return operations[id].tier === 'act' && !isNativeStartOperation(id);
}

const sessionParams = {
  'session.cancel': operations['session.cancel'].params,
  'session.close': operations['session.close'].params,
  'session.rename': operations['session.rename'].params,
  'session.setConfigOption': operations['session.setConfigOption'].params,
  'session.savePlan': operations['session.savePlan'].params,
  'shell.stop': operations['shell.stop'].params,
} satisfies Record<SessionActOperationId, z.ZodType<{ sessionId: string }>>;

type ActSources = Pick<
  OperationsDeps,
  'readSession' | 'database' | 'findWriter' | 'sessions'
>;

export function actTarget(
  deps: ActSources,
  operation: { id: SessionActOperationId; params: Json },
): ActTarget {
  const { sessionId } = operationParams(
    sessionParams[operation.id],
    operation.params,
  );

  const target = readActTarget(deps, { id: operation.id, sessionId });

  return {
    sessionId,
    projectId: target.projectId,
    startedBySessionId: target.startedBySessionId,
  };
}

// Only Operation provenance grants act scope; ACP's read-only parent relationship grants none.
export function ownsActTarget(
  caller: SessionCaller,
  target: ActTarget,
): boolean {
  return (
    ownsSession(caller.sessionId, target) &&
    caller.projectId === target.projectId
  );
}

function ownsSession(callerId: string, target: ActTarget): boolean {
  return (
    callerId === target.sessionId || callerId === target.startedBySessionId
  );
}

function readActTarget(
  deps: Parameters<typeof actTarget>[0],
  { id, sessionId }: { id: SessionActOperationId; sessionId: string },
): Omit<ActTarget, 'sessionId'> {
  return id === 'session.close'
    ? readSessionCloseTarget(deps, sessionId)
    : deps.readSession(sessionId);
}
