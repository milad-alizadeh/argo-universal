import type { FeedSubscribeInput, FeedSubscribeOutput } from '@repo/contracts';
import type { FeedDeps } from './feed';
import { FeedDelivery } from './feed-delivery';
import { FeedListener } from './feed-listener';

type SubscriptionStart = FeedSubscribeInput & {
  epoch: number;
  maxRevision: number;
};

const isReset = ({ after, epoch }: SubscriptionStart): boolean =>
  after !== null && after.epoch !== epoch;
const initialRevision = (start: SubscriptionStart): number =>
  start.after === null || isReset(start)
    ? start.maxRevision
    : start.after.revision;

async function* deliverQueuedEvent(
  listener: FeedListener,
  delivery: FeedDelivery,
): AsyncGenerator<FeedSubscribeOutput, boolean> {
  const event = listener.shift();
  if (event) {
    yield* delivery.deliver(event);
    return false;
  }
  return yield* waitForLiveEvent(listener, delivery);
}

async function* waitForLiveEvent(
  listener: FeedListener,
  delivery: FeedDelivery,
): AsyncGenerator<FeedSubscribeOutput, boolean> {
  const closed = listener.closedEvent();
  if (closed) {
    yield* delivery.close(closed);
    return true;
  }
  await listener.wait();
  return false;
}

async function* deliverNext(
  listener: FeedListener,
  delivery: FeedDelivery,
): AsyncGenerator<FeedSubscribeOutput, boolean> {
  listener.throwFailure();
  if (listener.takeOverflow()) {
    yield* delivery.recover();
    return false;
  }
  return yield* deliverQueuedEvent(listener, delivery);
}

async function* deliverLive(
  listener: FeedListener,
  delivery: FeedDelivery,
): AsyncGenerator<FeedSubscribeOutput> {
  while (!listener.isAborted()) {
    if (yield* deliverNext(listener, delivery)) return;
  }
}

async function* deliverSubscription(
  resources: FeedDeps,
  start: SubscriptionStart,
  listener: FeedListener,
): AsyncGenerator<FeedSubscribeOutput> {
  listener.throwFailure();
  if (isReset(start)) yield { type: 'reset', epoch: start.epoch };
  const delivery = new FeedDelivery(resources, start.sessionId, {
    after: initialRevision(start),
    storedRevision: start.maxRevision,
  });
  yield* delivery.readCatchUp();
  yield* deliverLive(listener, delivery);
}

export async function* streamFeed(
  resources: FeedDeps,
  input: FeedSubscribeInput,
  signal: AbortSignal | undefined,
): AsyncGenerator<FeedSubscribeOutput> {
  const start = { ...input, ...resources.readSession(input.sessionId) };
  const listener = new FeedListener(resources, input.sessionId, signal);
  try {
    listener.start();
    yield* deliverSubscription(resources, start, listener);
  } finally {
    listener.stop();
  }
}
