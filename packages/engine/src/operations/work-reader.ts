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
import type { WorkObservation } from './work-observation';

type Context = { deps: OperationsDeps; ids: WaitIds; caller: OperationCaller };

type Target = { id: string; work: NativeWork };

export function readOperationWork(
  context: Context,
  target: Target,
): WorkObservation {
  switch (target.work.kind) {
    case 'turn':
      return readTurn(context, target);
    case 'creation':
      return readCreation(context, target);
    case 'call':
      return readCall(context, target);
  }
}

function readCall(context: Context, { id, work }: Target): WorkObservation {
  const value = readSessionOperation(
    context.deps,
    work.sessionId,
    work.entityId,
  );

  if (value.error) throw new Error(value.error);

  if (!value.cancelled && value.work)
    return readOperationWork(context, linkedTarget(context, value.work));

  return observation(operationExecution(id, value), work);
}

function operationExecution(
  id: string,
  value: ReturnType<typeof readSessionOperation>,
): OperationExecution {
  const execution: OperationExecution = {
    kind: 'operation_execution',
    id,
    status: value.status,
  };

  if (value.result !== undefined) execution.result = value.result;

  if (value.cancelled) execution.cancelled = true;

  return execution;
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
  { id, work }: Target,
  turnId: string | undefined,
): WorkObservation {
  if (turnId)
    return readOperationWork(
      context,
      linkedTarget(context, {
        kind: 'turn',
        sessionId: work.sessionId,
        turnId,
      }),
    );

  return observation(
    {
      kind: 'operation_execution',
      id,
      status: 'settled',
      result: { sessionId: work.sessionId },
    },
    work,
  );
}

function opening({ id, work }: Target): WorkObservation {
  return observation(
    {
      kind: 'operation_execution',
      id,
      status: 'still_running',
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
