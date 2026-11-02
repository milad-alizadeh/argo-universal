import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';

// Scripted ACP traffic, recorded through the real Engine; this is not a Claude capture.
const reply = {
  sessionUpdate: 'session_message' as const,
  messageId: 'reply',
  senderSessionId: 'child',
  recipientSessionId: 'parent',
  content: [
    { type: 'text' as const, text: 'Two packages.' },
    {
      type: 'resource_link' as const,
      name: 'Source',
      uri: 'file:///source.ts',
    },
    { type: 'text' as const, text: 'Review complete.' },
  ],
};

export const reportRecordingScenario: ScriptedScenario = {
  sessionIds: ['parent'],
  steps: [
    {
      type: 'update',
      update: { sessionUpdate: 'subagent_update', sessionId: 'child' },
    },
    { type: 'update', sessionId: 'child', update: reply },
    { type: 'update', update: reply },
    {
      type: 'update',
      update: {
        sessionUpdate: 'tool_call',
        toolCallId: 'mcp-content',
        kind: 'other',
        title: 'Read the issue',
        status: 'in_progress',
        content: [
          {
            type: 'content',
            content: { type: 'text', text: 'Issue details from MCP' },
          },
        ],
      },
    },
    {
      type: 'update',
      update: {
        sessionUpdate: 'tool_call',
        toolCallId: 'mcp-raw',
        kind: 'other',
        title: 'Look up the issue',
        status: 'in_progress',
        rawInput: { issue: 1918 },
        rawOutput: { title: 'Live detail' },
        content: [],
      },
    },
  ],
};
