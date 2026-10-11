import {
  applyFeedChange,
  type Feed,
  type FeedStreamEvent,
  type FeedChangeResult,
} from '../feed-change';

const settleRow = (feed: Feed, rowId: string): FeedChangeResult =>
  applyFeedChange(
    feed,
    { type: 'patch', id: rowId, set: { state: 'settled' } },
    feed.rows[rowId]?.turnId ?? null,
  );
const readOpenTurnRows = (feed: Feed, turnId: string): Feed['rows'][string][] =>
  Object.values(feed.rows).filter(
    (row) => row.turnId === turnId && row.state === 'open',
  );
export const settleFeedTurn = (
  feed: Feed,
  turnId: string,
): { feed: Feed; events: FeedStreamEvent[] } | { rejection: string } => {
  const rows = readOpenTurnRows(feed, turnId);
  const events: FeedStreamEvent[] = [];
  let currentFeed = feed;
  for (const row of rows) {
    const result = settleRow(currentFeed, row.id);
    if ('rejection' in result) return result;
    currentFeed = result.feed;
    events.push(result.streamEvent);
  }
  return { feed: currentFeed, events };
};
