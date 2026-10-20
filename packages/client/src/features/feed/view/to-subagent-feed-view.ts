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

  return {
    ...rest,
    sessionUpdate: 'user_message',
    _meta: _meta && { acp: _meta.acp },
  };
}

const isSessionMessage = (row: SessionUpdate): row is SessionMessage =>
  row.sessionUpdate === 'session_message';

const asIncomingMessage = (row: SessionUpdate): SessionUpdate =>
  isSessionMessage(row) ? incomingMessage(row) : row;

/*
 * A Subagent's Feed. A child transcript's `session_message` rows are only the ones the Agent
 * reported there, which is the message that started it; Argo never copies the parent's outgoing
 * message in. Where the Agent reported none, the Feed starts with the child's own output.
 */
export function toSubagentFeedView(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
): FeedView {
  return toFeedView(rows.map(asIncomingMessage), snapshot);
}
