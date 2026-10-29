import type { Turn } from '@repo/contracts';
import type {
  OperationExecution,
  OperationWorkTarget,
} from '@repo/contracts/operations';
import type {
  OperationCallRead,
  SessionWork,
  SessionWorkRead,
  SessionWorkSource,
} from '../../sessions';
import type { TokenCaller } from '../session-tokens';
import { callExecution, workExecution, type AnsweredCall } from './execution';
import type { WaitIds } from './ids';
import type { WorkObservation } from './observation';

type Context = {
  source: SessionWorkSource;
  ids: WaitIds;
  caller: TokenCaller;
};

type Target = { id: string; work: SessionWork };

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
  if (value.status === 'failed') throw new Error(value.error);
  const link = linkedWork(value);

  if (link) return readOperationWork(context, linkedTarget(context, link));

  return observation(callExecution(id, value), work);
}

// A cancelled Tool call answers for itself, even once it started native work.
const linkedWork = (value: AnsweredCall): OperationWorkTarget | undefined =>
  value.status === 'cancelled' ? undefined : value.work;

function turnObservation(
  { id, work }: Target,
  { turn, requiresInput }: TurnRead,
): WorkObservation {
  return observation(
    workExecution(id, {
      status: turnStatus(turn, requiresInput),
      turn,
      result: { sessionId: work.sessionId },
    }),
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
    workExecution(id, { status, result: { sessionId: work.sessionId } }),
    work,
  );
}

function linkedTarget(
  { ids, caller }: Context,
  link: OperationWorkTarget,
): Target {
  const work = nativeWork(link);

  return { id: ids.issue(caller, work), work };
}

// The one way native work a target names becomes the Session work it is read as.
export const nativeWork = ({
  kind,
  sessionId,
  turnId,
}: OperationWorkTarget): SessionWork => ({ kind, sessionId, turnId });

function observation(
  execution: OperationExecution,
  work: SessionWork,
): WorkObservation {
  return { execution, work };
}
