import type {
  SessionMessage,
  SessionSnapshot,
  SessionUpdate,
  UserMessage,
} from '@repo/contracts';
import type { FeedView } from './feed-view';
import { toFeedView } from './to-feed-view';

/*
 * The incoming message as the Feed draws it: the Subagent's own prompt, in the place a Session's
 * prompt takes. Only the sender and recipient the Agent reported are dropped; nothing else changes.
 */
function incomingMessage(row: SessionMessage): UserMessage {
  const { _meta, ...rest } = row;
  const acp = _meta?.acp;

  return {
    ...rest,
    sessionUpdate: 'user_message',
    ...(acp && { _meta: { acp } }),
  };
}

const isFromChild = (row: SessionMessage): boolean =>
  row._meta?.argo?.senderSessionId === row.sessionId;

const recipient = (row: SessionMessage): string | undefined =>
  row._meta?.argo?.recipientSessionId;

const isReplyTo = (
  row: SessionMessage,
  parentId: string | undefined,
): boolean =>
  parentId !== undefined && isFromChild(row) && recipient(row) === parentId;

const isInitialMessage = (row: SessionUpdate): row is SessionMessage =>
  row.sessionUpdate === 'session_message' &&
  row.position === 0 &&
  !isFromChild(row);

// The child's leading incoming message draws as its prompt. Explicit replies to its parent keep their provenance.
export function toSubagentFeedView(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
  parentId?: string,
): FeedView {
  const [first, ...rest] = rows;

  const presented =
    first && isInitialMessage(first) ? [incomingMessage(first), ...rest] : rows;

  return showReplies(toFeedView(presented, snapshot), parentId);
}

function showReplies(view: FeedView, parentId: string | undefined): FeedView {
  return {
    ...view,
    items: view.items.map((item) => replyItem(item, parentId)),
  };
}

function replyItem(
  item: FeedView['items'][number],
  parentId: string | undefined,
): FeedView['items'][number] {
  if (item.type !== 'row') return item;

  return messageItem(item, parentId);
}

function messageItem(
  item: Extract<FeedView['items'][number], { type: 'row' }>,
  parentId: string | undefined,
): FeedView['items'][number] {
  if (item.row.sessionUpdate !== 'session_message') return item;

  if (!isReplyTo(item.row, parentId)) return item;

  return { type: 'child_reply', row: item.row };
}
