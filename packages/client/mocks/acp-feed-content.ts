import type { SessionUpdate } from '@repo/contracts';
import { recordedAgentMessage, type MockAgent } from './feed-message-mock';

export const createAcpContentRows = (agent: MockAgent): SessionUpdate[] => {
  const message = recordedAgentMessage(agent, 'markdown-answer');
  const envelope = {
    sessionId: message.sessionId,
    turnId: message.turnId,
    revision: 1,
    state: 'settled' as const,
  };
  return [
    {
      ...message,
      content: [
        { type: 'text', text: 'Before reference' },
        {
          type: 'resource_link',
          name: 'Project guide',
          uri: 'file:///project/guide.md',
          description: 'The current guide',
        },
        { type: 'text', text: 'After reference' },
        {
          type: 'resource',
          resource: {
            uri: 'file:///project/result.txt',
            text: 'Embedded result',
          },
        },
        {
          type: 'unsupported',
          contentKind: 'image',
          reason: 'Image output requires stored Blob materialization',
          reference: 'https://example.com/result.png',
        },
      ],
    },
    {
      ...envelope,
      id: 'notice',
      position: 2,
      sessionUpdate: 'notice',
      severity: 'warning',
      title: 'Context almost full',
      description: 'The next step may compact context.',
    },
    {
      ...envelope,
      id: 'future-notice',
      position: 3,
      sessionUpdate: 'notice',
      severity: 'future-severity',
      title: 'Future notice',
    },
    {
      ...envelope,
      id: 'compaction',
      position: 4,
      sessionUpdate: 'compaction_update',
      compactionId: 'compaction',
      status: 'in_progress',
      state: 'open',
      summary: [{ type: 'text', text: 'Live context summary' }],
    },
    {
      ...envelope,
      id: 'failed-compaction',
      position: 5,
      sessionUpdate: 'compaction_update',
      compactionId: 'failed-compaction',
      status: 'failed',
      error: 'Compaction could not finish',
    },
    {
      ...envelope,
      id: 'future-compaction',
      position: 6,
      sessionUpdate: 'compaction_update',
      compactionId: 'future-compaction',
      status: 'constructor',
    },
    {
      ...envelope,
      id: 'file-plan',
      position: 7,
      sessionUpdate: 'plan_update',
      plan: {
        type: 'file',
        planId: 'file-plan',
        uri: 'file:///project/plan.md',
      },
    },
    {
      ...envelope,
      id: 'markdown-plan',
      position: 8,
      sessionUpdate: 'plan_update',
      plan: {
        type: 'markdown',
        planId: 'markdown-plan',
        content: '# Read-only Plan\n\nReview the guide.',
      },
    },
    {
      ...envelope,
      id: 'tool',
      position: 9,
      sessionUpdate: 'tool_call_update',
      toolCallId: 'tool',
      kind: 'execute',
      status: 'completed',
      title: 'Lookup',
      content: [
        {
          type: 'content',
          content: {
            type: 'resource_link',
            name: 'Tool reference',
            uri: 'file:///project/tool.txt',
          },
        },
        {
          type: 'unsupported',
          contentKind: 'terminal',
          reason:
            'Terminal output is unavailable without a Client terminal resource',
        },
      ],
    },
  ];
};
