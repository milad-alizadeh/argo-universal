import type { ContentBlock } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { QueueSteering } from './queue-steering-types';
import type { SessionContext } from './session-context';

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

export function reservePrompt(
  context: SessionContext,
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
