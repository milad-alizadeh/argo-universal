import { TRPCError } from '@trpc/server';
import type { SessionRouterDeps } from '../router-deps';
import type { SessionMachineInput } from '../session-context';
import { readOpenSession } from '../session-system';
import { readSessionTurn } from '../work-turn';
import type { SessionCreationReceipt } from './creation-receipt';

type Sources = Pick<
  SessionRouterDeps,
  'database' | 'findWriter' | 'findFeed' | 'readSession' | 'sessions'
>;

export type CreationRead = SessionCreationReceipt | { status: 'opening' };

// The creation receipt is independent of idle/running state or a later Turn.
export function readSessionCreation(
  deps: Sources,
  sessionId: string,
  turnId: string,
): CreationRead {
  const context = readOpenSession(deps.sessions, sessionId);

  if (!context || context.input.kind === 'existing')
    return storedCreation(deps, sessionId, turnId);

  return openingCreation(context.input, context.creationReceipt, turnId);
}

function openingCreation(
  input: Extract<SessionMachineInput, { kind: 'new' }>,
  receipt: SessionCreationReceipt | null,
  turnId: string,
): CreationRead {
  if (input.turnId !== turnId)
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'This Session opening no longer exists',
    });

  return receipt ?? { status: 'opening' };
}

function storedCreation(
  deps: Sources,
  sessionId: string,
  turnId: string,
): CreationRead {
  const turn = readSessionTurn(deps, sessionId, turnId);

  return { status: 'accepted', start: { sessionId, turnId: turn.id } };
}
