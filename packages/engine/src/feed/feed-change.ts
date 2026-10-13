import type {
  ContentBlock,
  FeedChange,
  FeedUpsert,
  RowAppend,
  RowPatch,
  RowUpsert,
  SessionUpdate,
} from '@repo/contracts';
import { acceptFeedCandidate } from './feed-change-accept';
import { prepareFeedCandidate } from './feed-change-candidate';

// The part of a Session's Feed that the Feed actor holds in memory.
export interface Feed {
  sessionId: string;
  // The revision of the newest change.
  maxRevision: number;
  nextPosition: number;
  // Open rows, rows that settled since the last write, and written rows a change brought back, by id.
  rows: Record<string, SessionUpdate>;
}

// What `feed.subscribe` sends for one change.
export type FeedStreamEvent = RowUpsert | RowAppend | RowPatch;

// A refused change says why and leaves the Feed as it was.
export type FeedChangeResult =
  | { feed: Feed; streamEvent: FeedStreamEvent }
  | { rejection: string };

// The prompt a person sent, written as the Turn's first row (ADR 0012).
export const userMessageId = (turnId: string): string => `${turnId}:user`;

export const userMessageChange = (
  turnId: string,
  content: ContentBlock[],
): FeedUpsert => ({
  type: 'upsert',
  update: {
    id: userMessageId(turnId),
    sessionUpdate: 'user_message',
    messageId: userMessageId(turnId),
    state: 'settled',
    content,
  },
});

// The id of the row a change touches.
export const changedRowId = (change: FeedChange): string =>
  change.type === 'upsert' ? change.update.id : change.id;

export function applyFeedChange(
  feed: Feed,
  change: FeedChange,
  turnId: string | null,
): FeedChangeResult {
  const id = changedRowId(change);
  const candidate = prepareFeedCandidate(
    { feed, existing: feed.rows[id], revision: feed.maxRevision + 1, turnId },
    change,
  );
  return 'rejection' in candidate
    ? candidate
    : acceptFeedCandidate(feed, id, candidate);
}
