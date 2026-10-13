import type { SessionUpdate } from '@repo/contracts';
import {
  applyFeedChange,
  changedRowId,
  type Feed,
  type FeedChangeResult,
} from './feed-change';
import type { FeedContext, FeedEvent, FeedInternalEvent } from './feed-machine';

type ChangeEvent = Extract<FeedEvent, { type: 'feed.change' }>;
export type FeedApplication = {
  state?: Partial<FeedContext>;
  events: FeedInternalEvent[];
};
const restoreWrittenRow = (context: FeedContext, id: string): Feed => {
  const { sessionId, maxRevision, nextPosition } = context;
  const written = Object.hasOwn(context.rows, id)
    ? undefined
    : context.findWrittenRow(id);
  return {
    sessionId,
    maxRevision,
    nextPosition,
    rows: written ? { ...context.rows, [id]: written } : context.rows,
  };
};
const rejectCommit = (event: ChangeEvent, error: unknown): void => {
  event.committed?.reject(error);
};
const readChangeFeed = (
  context: FeedContext,
  event: ChangeEvent,
): Feed | { rejection: string } => {
  const id = changedRowId(event.change);
  try {
    return restoreWrittenRow(context, id);
  } catch (error) {
    rejectCommit(event, error);
    return {
      rejection: `could not read written row ${id}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
export const rejectedFeedApplication = (reason: string): FeedApplication => ({
  events: [{ type: 'feed.changeRejected', reason }],
});
const acceptedFeedApplication = (
  context: FeedContext,
  event: ChangeEvent,
  result: Extract<FeedChangeResult, { feed: Feed }>,
): FeedApplication => ({
  state: {
    ...result.feed,
    activityAt: context.now(),
    changedRowIds: changedRowIds(context, changedRowId(event.change)),
    streamEvents: [...context.streamEvents, result.streamEvent],
  },
  events: [appliedChangeEvent(result.feed, event)],
});
const appliedChangeEvent = (
  feed: Feed,
  event: ChangeEvent,
): FeedInternalEvent => ({
  type: 'feed.changeApplied',
  settled: isChangedRowSettled(feed.rows, event),
  committed: event.committed,
});
const changedRowIds = (context: FeedContext, id: string): string[] =>
  context.changedRowIds.includes(id)
    ? context.changedRowIds
    : [...context.changedRowIds, id];
const isChangedRowSettled = (
  rows: Record<string, SessionUpdate>,
  event: ChangeEvent,
): boolean => rows[changedRowId(event.change)]?.state === 'settled';
const applyRestoredFeedChange = (
  context: FeedContext,
  event: ChangeEvent,
  feed: Feed,
): FeedApplication => {
  const result = applyFeedChange(feed, event.change, event.turnId);
  if (!('rejection' in result))
    return acceptedFeedApplication(context, event, result);
  event.committed?.reject(new Error(result.rejection));
  return rejectedFeedApplication(result.rejection);
};
export const prepareFeedApplication = (
  context: FeedContext,
  event: ChangeEvent,
): FeedApplication => {
  const feed = readChangeFeed(context, event);
  return 'rejection' in feed
    ? rejectedFeedApplication(feed.rejection)
    : applyRestoredFeedChange(context, event, feed);
};
