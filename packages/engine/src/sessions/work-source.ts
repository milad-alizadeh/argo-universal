import type { Turn } from '@repo/contracts';
import type { OperationWorkTarget } from '@repo/contracts/operations';
import {
  readSessionCreation,
  type CreationRead,
} from './creation/creation-reader';
import { readOperationCall, type OperationCallRead } from './operation-call';
import type { SessionHandlerSources } from './session-sources';
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

export function createSessionWorkSource(
  sources: SessionHandlerSources,
): SessionWorkSource {
  return {
    read: (work) => readWork(sources, work),
    watch: createSessionWorkWatcher(sources),
  };
}

function readWork(
  sources: SessionHandlerSources,
  work: SessionWork,
): SessionWorkRead {
  if (work.kind === 'call') return readCall(sources, work);

  const { kind, sessionId, turnId } = work;

  if (kind === 'creation')
    return { kind, creation: readSessionCreation(sources, sessionId, turnId) };

  return { kind: 'turn', ...readTurn(sources, sessionId, turnId) };
}

const readCall = (
  sources: SessionHandlerSources,
  { sessionId, toolCallId }: Extract<SessionWork, { kind: 'call' }>,
): SessionWorkRead => ({
  kind: 'call',
  call: readOperationCall(sources, sessionId, toolCallId),
});

function readTurn(
  sources: SessionHandlerSources,
  sessionId: string,
  turnId: string,
): TurnRead {
  const turn = readSessionTurn(sources, sessionId, turnId);

  const requiresInput =
    turn.status !== 'ended' &&
    sessionTurnRequiresInput(sources.open, sessionId, turnId);

  return { turn, requiresInput };
}
