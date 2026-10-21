import type { SessionMessage } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  recordedFeedMock,
  recordedUserMessage,
} from '../../../lib/product/feed-message.mocks';
import { toSubagentFeedView } from './to-subagent-feed-view';

const recording = recordedFeedMock('agent-2', 'edit-and-command');

const prompt = recordedUserMessage('agent-2', 'edit-and-command');

const later: SessionMessage = {
  ...prompt,
  sessionUpdate: 'session_message',
  position: 150,
  messageId: 'later',
  _meta: { argo: { senderSessionId: 'child', recipientSessionId: 'parent' } },
};

it('does not turn a later message at the start of a paged tail into the child prompt', () => {
  const view = toSubagentFeedView([later], recording.snapshot);

  expect(
    view.items.some(
      (item) =>
        item.type === 'row' && item.row.sessionUpdate === 'user_message',
    ),
  ).toBe(false);
});
