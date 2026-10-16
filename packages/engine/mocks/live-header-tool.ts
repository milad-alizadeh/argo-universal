import type { ToolCallUpdate } from '@repo/contracts';

export const tool: ToolCallUpdate = {
  id: 'tool-1',
  sessionId: 'session-1',
  turnId: 'turn-1',
  position: 1,
  revision: 1,
  state: 'open',
  sessionUpdate: 'tool_call_update',
  toolCallId: 'tool-1',
  title: 'Read file',
  kind: 'read',
  status: 'in_progress',
  content: [],
  locations: [{ path: 'first.ts' }],
};
