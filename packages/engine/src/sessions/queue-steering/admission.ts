import type { ContentBlock } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { SessionContext } from '../session-context';
import type { QueueSteering } from './types';

type Context = Pick<
  SessionContext,
  'acpLease' | 'activeTurnId' | 'turnEnding' | 'queueSteering'
>;

function canSteerQueue(context: Context): boolean {
  return [
    context.acpLease?.steering === true,
    context.activeTurnId !== null,
    context.turnEnding.kind === 'completion',
    context.queueSteering === null,
  ].every(Boolean);
}

export function requireSteeringSupport(context: Context): void {
  if (canSteerQueue(context)) return;

  throw new TRPCError({
    code: 'CONFLICT',
    message: unavailableMessage(context),
  });
}

function unavailableMessage(context: Context): string {
  return context.acpLease?.steering
    ? 'This Session cannot accept steering now'
    : 'This Agent does not support steering; submit normally to queue the Prompt';
}

type ReservationContext = Pick<SessionContext, 'activeTurnId'> & {
  input: Pick<SessionContext['input'], 'createId'>;
};

export function reservePrompt(
  context: ReservationContext,
  prompt: ContentBlock[],
): QueueSteering {
  if (!context.activeTurnId) throw new Error('The Turn has finished');

  return {
    prompt,
    turnId: context.activeTurnId,
    token: context.input.createId(),
    messageId: context.input.createId(),
  };
}
