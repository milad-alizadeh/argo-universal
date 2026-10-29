import type { FeedSubscribeOutput, FeedSyncPoint } from '@repo/contracts';
import { closedFeedError } from '../utils/closed-feed-error';
import { applySubscriptionEvent, syncPointOf } from '../view/feed-state';
import type { FeedStore } from './use-feed-store';

type LiveEventInput = Pick<
  FeedStore,
  | 'activeSession'
  | 'closed'
  | 'setClosureError'
  | 'setSnapshot'
  | 'feedRef'
  | 'replaceFeed'
> & {
  sessionId: string | undefined;
  fetchWholeRow: (id: string) => Promise<void>;
  resetHistory: () => Promise<void>;
};

export function dispatchFeedEvent(
  event: FeedSubscribeOutput,
  input: LiveEventInput,
): void {
  if (input.activeSession.current !== input.sessionId) return;

  applyActiveEvent(event, input);
}

function applyActiveEvent(
  event: FeedSubscribeOutput,
  input: LiveEventInput,
): void {
  if (event.type === 'closed') return closeFeed(event, input);

  if (event.type === 'snapshot') return input.setSnapshot(event.snapshot);

  applyFeedEvent(event, input);
}

function closeFeed(
  event: Extract<FeedSubscribeOutput, { type: 'closed' }>,
  input: LiveEventInput,
): void {
  input.closed.current = true;
  input.setClosureError(closedFeedError(event));
}

function applyFeedEvent(
  event: Exclude<FeedSubscribeOutput, { type: 'closed' | 'snapshot' }>,
  input: LiveEventInput,
): void {
  const result = applySubscriptionEvent(input.feedRef.current, event);
  input.replaceFeed(result.feed);

  if (result.missingRowId) void input.fetchWholeRow(result.missingRowId);

  if (result.reset) void input.resetHistory();
}

type RetryInput = Pick<FeedStore, 'closed' | 'setClosureError' | 'feedRef'> & {
  syncPoint: FeedSyncPoint | null;
  setSyncPoint: (point: FeedSyncPoint | null) => void;
  reset: () => void;
};

export function retryFeed(input: RetryInput): void {
  input.closed.current = false;
  input.setClosureError(null);
  const next = syncPointOf(input.feedRef.current);

  if (next === null) return;

  if (sameSyncPoint(input.syncPoint, next)) input.reset();
  else input.setSyncPoint(next);
}

function sameSyncPoint(
  current: FeedSyncPoint | null,
  next: FeedSyncPoint,
): boolean {
  return current?.epoch === next.epoch && current.revision === next.revision;
}
