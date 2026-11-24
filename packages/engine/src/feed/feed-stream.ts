import {
  defaultPageRows,
  feedEventId,
  type FeedSubscribeInput,
  type FeedSubscribeOutput,
  type FeedSyncPoint,
  syncPointOfEventId,
} from '@repo/contracts';
import { tracked, type TrackedEnvelope } from '@trpc/server';
import type { FeedDeps } from './feed';
import { FeedDelivery } from './feed-delivery';
import { FeedListener } from './feed-listener';
import { readFeedPage } from './feed-page';

type SubscriptionStart = Pick<
  FeedSubscribeInput,
  'sessionId' | 'after' | 'tail' | 'batched'
> & {
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

  // An App with no rows opens on the newest ones, read with the sync point so no change falls between them.
  if (start.tail && start.after === null)
    yield {
      type: 'tail',
      page: readFeedPage(resources, {
        sessionId: start.sessionId,
        direction: 'tail',
        limit: defaultPageRows,
      }),
    };

  const delivery = new FeedDelivery(resources, start.sessionId, {
    after: initialRevision(start),
    storedRevision: start.maxRevision,
    batched: start.batched === true,
  });

  yield* delivery.readCatchUp();
  yield* deliverLive(listener, delivery);
}

// Where an App resumes: the event id tRPC sends again after a reconnect names the rows it has, unless the App already held higher ones (ADR-0007: the higher revision wins).
function resumePoint({
  after,
  lastEventId,
}: Pick<FeedSubscribeInput, 'after' | 'lastEventId'>): FeedSyncPoint | null {
  const last = lastEventId ? syncPointOfEventId(lastEventId) : null;

  if (!last) return after;

  if (after?.epoch !== last.epoch) return last;

  return after.revision > last.revision ? after : last;
}

export async function* streamFeed(
  resources: FeedDeps,
  input: FeedSubscribeInput,
  signal: AbortSignal | undefined,
): AsyncGenerator<FeedSubscribeOutput> {
  const start = {
    ...input,
    after: resumePoint(input),
    ...resources.readSession(input.sessionId),
  };

  const listener = new FeedListener(resources, input.sessionId, signal);

  try {
    listener.start();
    yield* deliverSubscription(resources, start, listener);
  } finally {
    listener.stop();
  }
}

// The sync point an event moves an App to: the revision it carries, or the new epoch's start.
function pointOfEvent(
  epoch: number,
  event: FeedSubscribeOutput,
): FeedSyncPoint | null {
  if (event.type === 'closed') return null;

  if (event.type === 'reset') return { epoch: event.epoch, revision: 0 };

  if (event.type === 'tail')
    return { epoch: event.page.epoch, revision: event.page.maxRevision };

  if (event.type === 'snapshot')
    return { epoch, revision: event.snapshot.maxRevision };

  return { epoch, revision: event.rev };
}

// An App that sends a `lastEventId`, or asks for the tail or for batches, keeps event ids.
const hasEventIds = ({
  lastEventId,
  tail,
  batched,
}: FeedSubscribeInput): boolean =>
  lastEventId !== undefined || tail === true || batched === true;

/*
 * `feed.subscribe`'s events with ids (tRPC's `tracked`), so the client's own reconnect sends the newest as `lastEventId` and the Feed resumes after it. A snapshot has one too, since an event without an id would clear the one before it; a closed Feed ends the subscription and needs none. An App that gives none of `lastEventId`, `tail` and `batched` is one from before event ids, which reads plain events.
 */
export async function* trackedFeed(
  resources: FeedDeps,
  input: FeedSubscribeInput,
  signal: AbortSignal | undefined,
): AsyncGenerator<FeedSubscribeOutput | TrackedEnvelope<FeedSubscribeOutput>> {
  let { epoch } = resources.readSession(input.sessionId);

  for await (const event of streamFeed(resources, input, signal)) {
    const point = pointOfEvent(epoch, event);

    epoch = point?.epoch ?? epoch;
    yield point && hasEventIds(input)
      ? tracked(feedEventId(point), event)
      : event;
  }
}
