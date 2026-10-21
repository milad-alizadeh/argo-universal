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

const isInitialMessage = (row: SessionUpdate): row is SessionMessage =>
  row.sessionUpdate === 'session_message' && row.position === 0;

/*
 * A Subagent's Feed. A child transcript's `session_message` rows are only the ones the Agent
 * reported there, and the message that started the child is at transcript position zero; Argo never copies
 * the parent's outgoing message in. So only a leading one is drawn, as the child's own prompt,
 * and a message the child itself sent later stays undrawn, as it does on a Session's own Feed.
 * Where the Agent reported none, the Feed starts with the child's own output.
 */
export function toSubagentFeedView(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
): FeedView {
  const [first, ...rest] = rows;

  if (!first || !isInitialMessage(first)) return toFeedView(rows, snapshot);

  return toFeedView([incomingMessage(first), ...rest], snapshot);
}
