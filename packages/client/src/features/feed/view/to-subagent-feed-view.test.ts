import type { SessionMessage, SessionUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  recordedFeedMock,
  recordedUserMessage,
} from '../../../lib/product/feed-message.mocks';
import type { FeedViewItem } from './feed-view';
import { toSubagentFeedView } from './to-subagent-feed-view';

const recording = recordedFeedMock('agent-2', 'edit-and-command');

const prompt = recordedUserMessage('agent-2', 'edit-and-command');

// The child transcript's own view of the message the parent sent it, as the Agent reported it.
const incoming: SessionMessage = {
  ...prompt,
  sessionUpdate: 'session_message',
  messageId: `${prompt.messageId}-incoming`,
  _meta: {
    argo: {
      senderSessionId: 'parent-session',
      recipientSessionId: 'subagent-session',
    },
  },
};

type Rows = Parameters<typeof toSubagentFeedView>[0];

const firstRow = (rows: Rows): FeedViewItem | undefined =>
  toSubagentFeedView(rows, recording.snapshot).items[0];

const firstDrawnRow = (rows: Rows): SessionUpdate | undefined => {
  const item = firstRow(rows);

  return item?.type === 'row' ? item.row : undefined;
};

it('draws the incoming message where a Session draws its prompt', () => {
  const item = firstRow([incoming, ...recording.rows.slice(1)]);

  expect(item).toMatchObject({
    type: 'row',
    row: { sessionUpdate: 'user_message', content: prompt.content },
  });
});

it('keeps the sender and recipient out of the drawn message', () => {
  const item = firstDrawnRow([incoming]);

  expect(item?._meta?.argo).toBeUndefined();
});

it("starts with the child's own output when the Agent reported no incoming message", () => {
  const item = firstDrawnRow(recording.rows.slice(1));

  expect(item?.sessionUpdate).not.toBe('user_message');
});
