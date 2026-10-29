import type { Turn } from '@repo/contracts';
import type { OperationWorkTarget } from '@repo/contracts/operations';
import {
  readSessionCreation,
  type CreationRead,
} from './creation/creation-reader';
import {
  createOperationCalls,
  type OperationCallRead,
  type OperationCalls,
} from './operation-call';
import type { SessionWorkSources } from './router-deps';
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
  deps: SessionWorkSources,
): SessionWorkSource {
  const calls = createOperationCalls(deps);

  return {
    read: (work) => readWork({ deps, calls }, work),
    watch: createSessionWorkWatcher(deps),
  };
}

type Readers = { deps: SessionWorkSources; calls: OperationCalls };

function readWork(
  { deps, calls }: Readers,
  work: SessionWork,
): SessionWorkRead {
  const { kind, sessionId } = work;

  if (work.kind === 'call')
    return { kind: 'call', call: calls.read(sessionId, work.toolCallId) };

  if (kind === 'creation')
    return {
      kind,
      creation: readSessionCreation(deps, sessionId, work.turnId),
    };

  return { kind: 'turn', ...readTurn(deps, sessionId, work.turnId) };
}

function readTurn(
  deps: SessionWorkSources,
  sessionId: string,
  turnId: string,
): TurnRead {
  const turn = readSessionTurn(deps, sessionId, turnId);

  const requiresInput =
    turn.status !== 'ended' &&
    sessionTurnRequiresInput(deps, sessionId, turnId);

  return { turn, requiresInput };
}
