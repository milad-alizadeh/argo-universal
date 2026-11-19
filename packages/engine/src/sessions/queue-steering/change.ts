import type { FeedUpsert, PromptQueue, QueuedPromptId } from '@repo/contracts';
import {
  nonUserPromptChange,
  userMessageChange,
  type FeedEvent,
} from '../../feed';
import { queueWrite } from '../prompt-queue';
import type { SessionContext } from '../session-context';
import { turnStep, type TurnStep } from '../turn';
import { promptTaken, type TurnHappening } from '../turn-happenings';
import type { QueueSteering, QueueSteeringCommand } from './types';

type Finish = Extract<
  QueueSteeringCommand,
  { type: 'session.finishQueueSteering' }
>;

interface Consumption {
  context: SessionContext;
  event: Finish;
  steering: QueueSteering;
  queue: PromptQueue;
}

export function releaseQueueSteering(
  context: SessionContext,
  token: string,
): Partial<SessionContext> {
  const queueHolds = Object.fromEntries(
    Object.entries(context.queueHolds).filter(([, held]) => held !== token),
  );

  return { queueSteering: null, queueHolds };
}

export function consumeQueueSteering(
  context: SessionContext,
  event: Finish,
  steering: QueueSteering,
): TurnStep {
  const input = consumption(context, event, steering);

  event.committed.promise.catch(() => {});

  return turnStep({
    change: consumedChange(input),
    feed: [consumedMessage(input)],
    happenings: takenHappenings(steering),
  });
}

// A steered queue item was taken into the running Turn; a steered draft was never queued.
const takenHappenings = ({
  queuedId,
  turnId,
}: QueueSteering): TurnHappening[] =>
  queuedId ? [promptTaken(queuedId, turnId)] : [];

function remainingQueue(
  context: SessionContext,
  id: QueuedPromptId | undefined,
): PromptQueue {
  return {
    ...context.promptQueue,
    items: context.promptQueue.items.filter((item) => item.id !== id),
  };
}

function consumedChange({
  context,
  event,
  queue,
}: Consumption): Partial<SessionContext> {
  return {
    ...releaseQueueSteering(context, event.token),
    promptQueue: queue,
    queueCommitted: event.committed.promise,
  };
}

// The steered Prompt is stored as its sender's: the person's own, or the Voice call's or a Plugin's.
const steeredChange = ({
  turnId,
  prompt,
  messageId,
  sender,
}: QueueSteering): FeedUpsert =>
  sender
    ? nonUserPromptChange(messageId, prompt, sender)
    : userMessageChange(turnId, prompt, messageId);

function consumedMessage({
  context,
  event,
  steering,
  queue,
}: Consumption): FeedEvent {
  return {
    type: 'feed.change',
    turnId: steering.turnId,
    change: steeredChange(steering),
    commitWith: queueWrite(context.sessionId, queue),
    committed: event.committed,
  };
}

function consumption(
  context: SessionContext,
  event: Finish,
  steering: QueueSteering,
): Consumption {
  return {
    context,
    event,
    steering,
    queue: remainingQueue(context, steering.queuedId),
  };
}
