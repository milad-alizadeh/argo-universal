import type {
  AgentMessage,
  FeedChange,
  SessionUpdateState,
} from '@repo/contracts';

// A stored message row of `session-1` at `position`, last changed at `revision`.
export const storedMessage = (
  position: number,
  revision = position + 1,
): AgentMessage => ({
  id: `message-${position}#0`,
  sessionId: 'session-1',
  position,
  revision,
  turnId: 'turn-1',
  state: 'settled',
  sessionUpdate: 'agent_message',
  messageId: `message-${position}`,
  content: [{ type: 'text', text: `Message ${position}` }],
});

export const messageChange = (state: SessionUpdateState): FeedChange => ({
  type: 'upsert',
  update: {
    id: 'reply',
    messageId: 'reply',
    sessionUpdate: 'agent_message',
    state,
    content: [{ type: 'text', text: 'Hello' }],
  },
});
