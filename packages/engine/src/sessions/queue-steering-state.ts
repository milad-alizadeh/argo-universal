import { TRPCError } from '@trpc/server';
import {
  consumeQueueSteering,
  releaseQueueSteering,
} from './queue-steering-change';
import type {
  QueueSteering,
  QueueSteeringCommand,
} from './queue-steering-types';
import type { SessionContext } from './session-context';
import { turnStep, type TurnStep } from './turn';

type Context = Pick<
  SessionContext,
  'acpLease' | 'activeTurnId' | 'turnEnding' | 'queueSteering'
>;

type Reserve = Extract<
  QueueSteeringCommand,
  { type: 'session.reserveQueueSteering' }
>;

type Finish = Extract<
  QueueSteeringCommand,
  { type: 'session.finishQueueSteering' }
>;

export function canSteerQueue(context: Context): boolean {
  return [
    context.acpLease?.steering === true,
    context.activeTurnId !== null,
    context.turnEnding.kind === 'completion',
    context.queueSteering === null,
  ].every(Boolean);
}

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
    queueHolds: { ...context.queueHolds, [steering.row.id]: steering.token },
  };
}

function reserve(context: SessionContext, { command }: Reserve): QueueSteering {
  if (!canSteerQueue(context))
    return conflict('This Session cannot accept steering now');

  return reserveRow(context, command.revision, queuedRow(context, command.id));
}

function reserveRow(
  context: SessionContext,
  revision: number,
  row: QueueSteering['row'],
): QueueSteering {
  if (row.revision !== revision)
    return conflict('This Prompt changed in another App');

  if (context.queueHolds[row.id])
    return conflict('Finish editing this Prompt first');

  return {
    row,
    turnId: runningTurn(context),
    token: context.input.createId(),
  };
}

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

function queuedRow(context: SessionContext, id: string): QueueSteering['row'] {
  const row = context.promptQueue.items.find((item) => item.id === id);

  if (!row || row.id === context.dispatchingQueueId)
    return conflict('This Prompt has already started');

  return row;
}

function runningTurn(context: SessionContext): string {
  return context.activeTurnId ?? conflict('The Turn has finished');
}
