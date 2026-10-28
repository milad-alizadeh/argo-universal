import { TRPCError } from '@trpc/server';
import type { SessionCreationReceipt } from './creation-receipt';
import { readSessionTurn } from './operation-work';
import type { SessionRouterDeps } from './router-deps';

type Sources = Pick<
  SessionRouterDeps,
  'database' | 'findWriter' | 'findFeed' | 'readSession' | 'sessions'
>;

type CreationRead = SessionCreationReceipt | { status: 'opening' };

// The creation receipt is independent of idle/running state or a later Turn.
export function readSessionCreation(
  deps: Sources,
  sessionId: string,
  turnId: string,
): CreationRead {
  const actor = deps.sessions.getSnapshot().context.sessions[sessionId];
  const context = actor?.getSnapshot().context;

  if (!context || context.input.kind === 'existing')
    return storedCreation(deps, sessionId, turnId);

  if (context.input.turnId !== turnId)
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'This Session opening no longer exists',
    });

  return context.creationReceipt ?? { status: 'opening' };
}

function storedCreation(
  deps: Sources,
  sessionId: string,
  turnId: string,
): CreationRead {
  const turn = readSessionTurn(deps, sessionId, turnId);

  return { status: 'accepted', start: { sessionId, turnId: turn.id } };
}
