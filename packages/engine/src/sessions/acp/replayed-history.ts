// Resumed Agent context is not new Feed content.
const replayedHistoryKinds = new Set([
  'user_message_chunk',
  'agent_message_chunk',
  'agent_thought_chunk',
  'tool_call',
  'tool_call_update',
  'plan',
]);

export const isReplayedHistory = (
  vendorSessionId: string | null,
  sessionUpdate: string,
): boolean =>
  vendorSessionId !== null && replayedHistoryKinds.has(sessionUpdate);
