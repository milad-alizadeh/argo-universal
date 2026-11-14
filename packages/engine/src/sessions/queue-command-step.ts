import { changePromptQueue, queueWrite } from './prompt-queue';
import {
  requireQueueConnection,
  reconcileQueueHolds,
  type QueueEditDisconnected,
} from './queue-hold-connections';
import type { SessionContext, SessionCommand } from './session-context';
import { turnStep, type TurnStep } from './turn';

type QueueContext = Pick<
  SessionContext,
  | 'sessionId'
  | 'promptQueue'
  | 'queueHolds'
  | 'queueHoldConnections'
  | 'dispatchingQueueId'
> & { input: Pick<SessionContext['input'], 'createId'> };

type QueueEvent = Extract<SessionCommand, { type: 'session.queue' }>;

export function queueCommandStep(
  context: QueueContext,
  event: QueueEvent,
  disconnected: (event: QueueEditDisconnected) => void,
): TurnStep {
  try {
    return acceptQueueCommand(context, event, disconnected);
  } catch (error) {
    event.committed.reject(error);

    return turnStep({});
  }
}

function committedQueueStep(
  context: Pick<SessionContext, 'sessionId'>,
  event: QueueEvent,
  change: ReturnType<typeof changePromptQueue>,
): TurnStep {
  return turnStep({
    change: { ...change, queueCommitted: event.committed.promise },
    writes: [
      {
        job: queueWrite(context.sessionId, change.promptQueue),
        committed: event.committed,
      },
    ],
  });
}

type ConnectedChange = {
  change: ReturnType<typeof changePromptQueue>;
  disconnected: (event: QueueEditDisconnected) => void;
};

function connectedQueueStep(
  context: Pick<
    SessionContext,
    'sessionId' | 'queueHolds' | 'queueHoldConnections'
  >,
  event: QueueEvent,
  input: ConnectedChange,
): TurnStep {
  const step = committedQueueStep(context, event, input.change);

  const queueHoldConnections = reconcileQueueHolds(context, event, {
    holds: input.change.queueHolds,
    disconnected: input.disconnected,
  });

  return { ...step, change: { ...step.change, queueHoldConnections } };
}

function acceptQueueCommand(
  context: QueueContext,
  event: QueueEvent,
  disconnected: ConnectedChange['disconnected'],
): TurnStep {
  requireQueueConnection(event);
  const command = event.command;
  const createId = context.input.createId;
  const change = changePromptQueue(context, command, createId);

  event.committed.promise.catch(() => {});

  return connectedQueueStep(context, event, { change, disconnected });
}
