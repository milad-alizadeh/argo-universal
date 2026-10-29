import type { Turn } from '@repo/contracts';
import type { OperationWorkTarget } from '@repo/contracts/operations';
import {
  readSessionCreation,
  type CreationRead,
} from './creation/creation-reader';
import type { OpenSessions } from './open-sessions';
import { readOperationCall, type OperationCallRead } from './operation-call';
import { readSessionTurn, sessionTurnRequiresInput } from './work-turn';
import {
  createSessionWorkWatcher,
  type SessionWorkWatcher,
} from './work-watcher';

// The native Session work an Operation waits for: a Session opening and its first Turn, a Turn, or an Operation Tool call.
export type SessionWork =
  | OperationWorkTarget
  | { kind: 'call'; sessionId: string; toolCallId: string };

// The Turn or the Tool call that names the work within its Session.
export const sessionWorkItem = (work: SessionWork): string =>
  work.kind === 'call' ? work.toolCallId : work.turnId;

// A Turn that has not ended may wait for the user's answer to an Input request.
type TurnRead = { turn: Turn; requiresInput: boolean };

export type SessionWorkRead =
  | { kind: 'creation'; creation: CreationRead }
  | ({ kind: 'turn' } & TurnRead)
  | { kind: 'call'; call: OperationCallRead };

export type SessionWorkSource = {
  read: (work: SessionWork) => SessionWorkRead;
  watch: SessionWorkWatcher;
};

export function createSessionWorkSource(open: OpenSessions): SessionWorkSource {
  return {
    read: (work) => readWork(open, work),
    watch: createSessionWorkWatcher(open),
  };
}

function readWork(open: OpenSessions, work: SessionWork): SessionWorkRead {
  const { kind, sessionId } = work;

  if (work.kind === 'call')
    return {
      kind: 'call',
      call: readOperationCall(open, sessionId, work.toolCallId),
    };

  if (kind === 'creation')
    return {
      kind,
      creation: readSessionCreation(open, sessionId, work.turnId),
    };

  return { kind: 'turn', ...readTurn(open, sessionId, work.turnId) };
}

function readTurn(
  open: OpenSessions,
  sessionId: string,
  turnId: string,
): TurnRead {
  const turn = readSessionTurn(open, sessionId, turnId);

  const requiresInput =
    turn.status !== 'ended' &&
    sessionTurnRequiresInput(open, sessionId, turnId);

  return { turn, requiresInput };
}
