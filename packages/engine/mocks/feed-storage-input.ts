import type { AgentMessage } from '@repo/contracts';

export const row = (overrides: Partial<AgentMessage> = {}): AgentMessage => ({
  sessionId: 'session-1',
  id: 'row-1',
  position: 0,
  sessionUpdate: 'agent_message',
  revision: 1,
  turnId: 'turn-1',
  state: 'open',
  messageId: 'message-1',
  content: [],
  ...overrides,
});
