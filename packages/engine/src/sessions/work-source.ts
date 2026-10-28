import type { Turn } from '@repo/contracts';
import { readSessionCreation, type CreationRead } from './creation-reader';
import {
  createOperationCalls,
  type OperationCallRead,
  type OperationCalls,
} from './operation-call';
import type { SessionRouterDeps } from './router-deps';
import { readSessionTurn, sessionTurnRequiresInput } from './work-turn';
import {
  createSessionWorkWatcher,
  type SessionWorkWatcher,
} from './work-watcher';

// The native Session work an Operation waits for: a Session opening, a Turn, or an Operation Tool call.
export type SessionWork = {
  kind: 'creation' | 'turn' | 'call';
  sessionId: string;
  // The opening's first Turn, the Turn, or the Tool call.
  entityId: string;
};

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

type Sources = Pick<
  SessionRouterDeps,
  'database' | 'findWriter' | 'findFeed' | 'readSession' | 'sessions'
>;

export function createSessionWorkSource(deps: Sources): SessionWorkSource {
  const calls = createOperationCalls(deps);

  return {
    read: (work) => readWork({ deps, calls }, work),
    watch: createSessionWorkWatcher(deps),
  };
}

type Readers = { deps: Sources; calls: OperationCalls };

function readWork(
  { deps, calls }: Readers,
  { kind, sessionId, entityId }: SessionWork,
): SessionWorkRead {
  if (kind === 'creation')
    return { kind, creation: readSessionCreation(deps, sessionId, entityId) };

  if (kind === 'call') return { kind, call: calls.read(sessionId, entityId) };

  return { kind, ...readTurn(deps, sessionId, entityId) };
}

function readTurn(deps: Sources, sessionId: string, turnId: string): TurnRead {
  const turn = readSessionTurn(deps, sessionId, turnId);

  const requiresInput =
    turn.status !== 'ended' &&
    sessionTurnRequiresInput(deps, sessionId, turnId);

  return { turn, requiresInput };
}
