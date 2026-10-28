import type { Turn } from '@repo/contracts';
import { readSessionCreation, type CreationRead } from './creation-reader';
import { createOperationCalls, type OperationCallRead } from './operation-call';
import type { SessionRouterDeps } from './router-deps';
import { readSessionTurn, sessionTurnRequiresInput } from './work-turn';
import {
  createSessionWorkWatcher,
  type SessionWorkWatcher,
} from './work-watcher';

// The native Session work an Operation waits for: a Session opening, a Turn, or an Operation Tool call.
export type SessionWorkSource = {
  creation: (sessionId: string, turnId: string) => CreationRead;
  turn: (sessionId: string, turnId: string) => Turn;
  // Whether the running Turn waits for the user's answer to an Input request.
  turnRequiresInput: (sessionId: string, turnId: string) => boolean;
  call: (sessionId: string, toolCallId: string) => OperationCallRead;
  watch: SessionWorkWatcher;
};

type Sources = Pick<
  SessionRouterDeps,
  'database' | 'findWriter' | 'findFeed' | 'readSession' | 'sessions'
>;

export function createSessionWorkSource(deps: Sources): SessionWorkSource {
  const calls = createOperationCalls(deps);

  return {
    creation: (sessionId, turnId) =>
      readSessionCreation(deps, sessionId, turnId),
    turn: (sessionId, turnId) => readSessionTurn(deps, sessionId, turnId),
    turnRequiresInput: (sessionId, turnId) =>
      sessionTurnRequiresInput(deps, sessionId, turnId),
    call: calls.read,
    watch: createSessionWorkWatcher(deps),
  };
}
