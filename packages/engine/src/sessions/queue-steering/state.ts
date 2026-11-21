import type { QueuedPrompt } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { requireQueueSteeringAuthority } from '../prompt-authorization';
import type { SessionContext } from '../session-context';
import { turnStep, type TurnStep } from '../turn';
import { reservePrompt, requireSteeringSupport } from './admission';
import { consumeQueueSteering, releaseQueueSteering } from './change';
import type { QueueSteering, QueueSteeringCommand } from './types';

type Reserve = Extract<
  QueueSteeringCommand,
  { type: 'session.reserveQueueSteering' }
>;

type Finish = Extract<
  QueueSteeringCommand,
  { type: 'session.finishQueueSteering' }
>;

const conflict = (message: string): never => {
  throw new TRPCError({ code: 'CONFLICT', message });
};

export function reserveQueueSteering(
  context: SessionContext,
  event: Reserve,
): Partial<SessionContext> {
  try {
    const steering = reserve(context, event);
    event.reserved.resolve(steering);

    return reservedChange(context, steering);
  } catch (error) {
    event.reserved.reject(error);

    return {};
  }
}

function reservedChange(
  context: SessionContext,
  steering: QueueSteering,
): Partial<SessionContext> {
  return {
    queueSteering: steering,
    queueHolds: steering.queuedId
      ? { ...context.queueHolds, [steering.queuedId]: steering.token }
      : context.queueHolds,
  };
}

function reserve(context: SessionContext, { command }: Reserve): QueueSteering {
  requireSteeringSupport(context);

  if (command.action === 'steerDraft')
    return reservePrompt(context, command.prompt);

  return reserveRow(context, command.revision, queuedRow(context, command.id));
}

// The Prompt is the one the App saw, and nobody is editing it.
function requireFree(
  context: SessionContext,
  revision: number,
  row: QueuedPrompt,
): void {
  if (row.revision !== revision) conflict('This Prompt changed in another App');

  if (context.queueHolds[row.id]) conflict('Finish editing this Prompt first');
}

// The Feed row a queued Prompt takes in the Turn it was steered into.
export const steeredMessageId = (turnId: string, queuedId: string): string =>
  `${turnId}:steer:${queuedId}`;

function reserveRow(
  context: SessionContext,
  revision: number,
  row: QueuedPrompt,
): QueueSteering {
  requireFree(context, revision, row);

  requireQueueSteeringAuthority(row.sender);

  return {
    ...reservePrompt(context, row.prompt),
    ...senderOf(row),
    queuedId: row.id,
    messageId: steeredMessageId(runningTurn(context), row.id),
  };
}

// A Prompt that did not come from the person keeps its sender when steered.
const senderOf = (row: QueuedPrompt): Pick<QueueSteering, 'sender'> =>
  row.sender ? { sender: row.sender } : {};

export function finishQueueSteering(
  context: SessionContext,
  event: Finish,
): TurnStep {
  try {
    return settleSteering(context, event);
  } catch (error) {
    event.committed.reject(error);

    return turnStep({});
  }
}

function settleSteering(context: SessionContext, event: Finish): TurnStep {
  const steering = requireSteering(context, event.token);

  return event.injected
    ? consumeQueueSteering(context, event, steering)
    : releasedSteering(context, event);
}

function requireSteering(
  context: SessionContext,
  token: string,
): QueueSteering {
  const steering = context.queueSteering;

  if (!steering || steering.token !== token)
    return conflict('The queue steering request ended');

  return steering;
}

function releasedSteering(context: SessionContext, event: Finish): TurnStep {
  event.committed.resolve();

  return turnStep({ change: releaseQueueSteering(context, event.token) });
}

function queuedRow(context: SessionContext, id: string): QueuedPrompt {
  const row = context.promptQueue.items.find((item) => item.id === id);

  if (!row || row.id === context.dispatchingQueueId)
    return conflict('This Prompt has already started');

  return row;
}

function runningTurn(context: SessionContext): string {
  return context.activeTurnId ?? conflict('The Turn has finished');
}
