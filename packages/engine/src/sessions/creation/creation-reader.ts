import { TRPCError } from '@trpc/server';
import type { SessionMachineInput } from '../session-context';
import type { HandlerSources } from '../session-sources';
import { readSessionTurn } from '../work-turn';
import type { SessionCreationReceipt } from './creation-receipt';

type CreationSources = HandlerSources<'database' | 'findWriter', 'context'>;

export type CreationRead = SessionCreationReceipt | { status: 'opening' };

// The creation receipt is independent of idle/running state or a later Turn.
export function readSessionCreation(
  sources: CreationSources,
  sessionId: string,
  turnId: string,
): CreationRead {
  const context = sources.open.context(sessionId);

  if (!context || context.input.kind === 'existing')
    return storedCreation(sources, sessionId, turnId);

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
  sources: CreationSources,
  sessionId: string,
  turnId: string,
): CreationRead {
  const turn = readSessionTurn(sources, sessionId, turnId);

  return { status: 'accepted', start: { sessionId, turnId: turn.id } };
}
