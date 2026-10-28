import type { Turn } from '@repo/contracts';
import type {
  OperationExecution,
  OperationWorkTarget,
} from '@repo/contracts/operations';
import type {
  OperationCallRead,
  SessionWorkRead,
  SessionWorkSource,
} from '../sessions';
import type { OperationCaller } from './session-tokens';
import type { NativeWork, WaitIds } from './wait-id';
import { operationExecution } from './work-call-result';
import type { WorkObservation } from './work-observation';

type Context = {
  source: SessionWorkSource;
  ids: WaitIds;
  caller: OperationCaller;
};

type Target = { id: string; work: NativeWork };

type TurnRead = Extract<SessionWorkRead, { kind: 'turn' }>;

type CreationRead = Extract<SessionWorkRead, { kind: 'creation' }>['creation'];

export function readOperationWork(
  context: Context,
  target: Target,
): WorkObservation {
  const read = context.source.read(target.work);

  if (read.kind === 'turn') return turnObservation(target, read);

  if (read.kind === 'creation')
    return readCreation(context, target, read.creation);

  return readCall(context, target, read.call);
}

function readCall(
  context: Context,
  { id, work }: Target,
  value: OperationCallRead,
): WorkObservation {
  requireCallResult(value);

  if (!value.cancelled && value.work)
    return readOperationWork(context, linkedTarget(context, value.work));

  return observation(operationExecution(id, value), work);
}

function requireCallResult(value: OperationCallRead): void {
  if (value.error) throw new Error(value.error);
}

function turnObservation(
  { id, work }: Target,
  { turn, requiresInput }: TurnRead,
): WorkObservation {
  return observation(
    {
      kind: 'operation_execution',
      id,
      status: turnStatus(turn, requiresInput),
      turn,
      result: { sessionId: work.sessionId },
    },
    work,
  );
}

function turnStatus(
  turn: Turn,
  requiresInput: boolean,
): OperationExecution['status'] {
  if (turn.status === 'ended') return 'settled';

  return requiresInput ? 'waiting_for_user' : 'still_running';
}

function readCreation(
  context: Context,
  target: Target,
  creation: CreationRead,
): WorkObservation {
  if (creation.status === 'failed') throw new Error(creation.message);

  if (creation.status === 'opening') return opening(target);

  return acceptedCreation(context, target, creation.start.turnId);
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

  return readOperationWork(context, linkedTarget(context, link));
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
