import type { SessionUpdate } from '@agentclientprotocol/sdk';

export const acpUpdates: SessionUpdate[] = [
  {
    sessionUpdate: 'user_message_chunk',
    content: { type: 'text', text: 'Input' },
  },
  {
    sessionUpdate: 'agent_message_chunk',
    content: { type: 'text', text: 'Output' },
    _meta: { opaque: { preserved: true } },
  },
  {
    sessionUpdate: 'agent_thought_chunk',
    content: { type: 'text', text: 'Thought' },
  },
  { sessionUpdate: 'tool_call', toolCallId: 'tool-one', title: 'Read file' },
  {
    sessionUpdate: 'tool_call_update',
    toolCallId: 'tool-one',
    status: 'completed',
  },
  {
    sessionUpdate: 'plan',
    entries: [
      { content: 'Read file', priority: 'medium', status: 'in_progress' },
    ],
  },
  {
    sessionUpdate: 'plan_update',
    plan: { type: 'items', planId: 'plan-one', entries: [] },
  },
  { sessionUpdate: 'plan_removed', planId: 'plan-one' },
  {
    sessionUpdate: 'available_commands_update',
    availableCommands: [{ name: 'review', description: 'Review changes' }],
  },
  { sessionUpdate: 'current_mode_update', currentModeId: 'plan' },
  { sessionUpdate: 'config_option_update', configOptions: [] },
  { sessionUpdate: 'session_info_update', title: 'Updated Session' },
  { sessionUpdate: 'usage_update', used: 64, size: 1024 },
  { sessionUpdate: 'notice', severity: 'info', title: 'Notice' },
  {
    sessionUpdate: 'compaction_update',
    compactionId: 'compaction-one',
    status: 'in_progress',
  },
  {
    sessionUpdate: 'compaction_summary_chunk',
    compactionId: 'compaction-one',
    content: { type: 'text', text: 'Summary' },
  },
  {
    sessionUpdate: 'subagent_update',
    sessionId: 'child-one',
    state: { state: 'idle' },
  },
  {
    sessionUpdate: 'session_message',
    messageId: 'message-one',
    content: [{ type: 'text', text: 'Question' }],
  },
  {
    sessionUpdate: 'session_message_chunk',
    messageId: 'message-one',
    content: { type: 'text', text: 'Answer' },
  },
];
