import type { Turn } from '@repo/contracts';
import type {
  OperationExecution,
  OperationWorkTarget,
} from '@repo/contracts/operations';
import {
  readSessionOperation,
  readSessionTurn,
  readSessionCreation,
  sessionTurnRequiresInput,
} from '../sessions';
import type { OperationsDeps } from './operations';
import type { OperationCaller } from './session-tokens';
import type { NativeWork, WaitIds } from './wait-id';
import { operationExecution } from './work-call-result';
import type { WorkObservation } from './work-observation';

type Context = { deps: OperationsDeps; ids: WaitIds; caller: OperationCaller };

type Target = { id: string; work: NativeWork };

export function readOperationWork(
  context: Context,
  target: Target,
): WorkObservation {
  if (target.work.kind === 'turn') return readTurn(context, target);

  if (target.work.kind === 'creation') return readCreation(context, target);

  return readCall(context, target);
}

function readCall(context: Context, { id, work }: Target): WorkObservation {
  const value = readSessionOperation(
    context.deps,
    work.sessionId,
    work.entityId,
  );

  requireCallResult(value);

  return linkedCall(context, { id, work }, value);
}

function requireCallResult(
  value: ReturnType<typeof readSessionOperation>,
): void {
  if (value.error) throw new Error(value.error);
}

function linkedCall(
  context: Context,
  { id, work }: Target,
  value: ReturnType<typeof readSessionOperation>,
): WorkObservation {
  if (!value.cancelled && value.work)
    return readOperationWork(context, linkedTarget(context, value.work));

  return observation(operationExecution(id, value), work);
}

function readTurn({ deps }: Context, { id, work }: Target): WorkObservation {
  const turn = readSessionTurn(deps, work.sessionId, work.entityId);

  return observation(
    {
      kind: 'operation_execution',
      id,
      status: turnStatus(deps, turn),
      turn,
      result: { sessionId: work.sessionId },
    },
    work,
  );
}

function turnStatus(
  deps: OperationsDeps,
  turn: Turn,
): OperationExecution['status'] {
  if (turn.status === 'ended') return 'settled';

  return sessionTurnRequiresInput(deps, turn.sessionId, turn.id)
    ? 'waiting_for_user'
    : 'still_running';
}

function readCreation(context: Context, target: Target): WorkObservation {
  const { id, work } = target;

  const receipt = readSessionCreation(
    context.deps,
    work.sessionId,
    work.entityId,
  );

  if (receipt.status === 'failed') throw new Error(receipt.message);

  if (receipt.status === 'opening') return opening(target);

  return acceptedCreation(context, { id, work }, receipt.start.turnId);
}

function acceptedCreation(
  context: Context,
  target: Target,
  turnId: string | undefined,
): WorkObservation {
  if (!turnId) return opening(target, 'settled');

  const link: OperationWorkTarget = {
    kind: 'turn',
    sessionId: target.work.sessionId,
    turnId,
  };

  return readTurn(context, linkedTarget(context, link));
}

function opening(
  { id, work }: Target,
  status: OperationExecution['status'] = 'still_running',
): WorkObservation {
  return observation(
    {
      kind: 'operation_execution',
      id,
      status,
      result: { sessionId: work.sessionId },
    },
    work,
  );
}

function linkedTarget(
  { ids, caller }: Context,
  link: OperationWorkTarget,
): Target {
  const work: NativeWork = {
    kind: link.kind,
    sessionId: link.sessionId,
    entityId: link.turnId,
  };

  return { id: ids.issue(caller, work), work };
}

function observation(
  execution: OperationExecution,
  work: NativeWork,
): WorkObservation {
  return {
    execution,
    sessionId: work.sessionId,
    started: work.kind !== 'call',
  };
}
