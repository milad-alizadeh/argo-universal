import type { ContentBlock } from '@agentclientprotocol/sdk';
import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

const parent = 'reports-parent';

const child = 'reports-child';

const other = 'reports-other';

const association = (id: string, title: string): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'subagent_update',
    sessionId: id,
    title,
    state: { state: 'idle', stopReason: 'end_turn' },
  },
});

const content = (id: string, text: string): ContentBlock[] =>
  id === 'report-0'
    ? [
        { type: 'text' as const, text },
        {
          type: 'resource_link' as const,
          name: 'Source',
          uri: 'file:///source.ts',
        },
        { type: 'text' as const, text: 'Review complete.' },
      ]
    : [{ type: 'text' as const, text }];

const report = (id: string, text: string, sender = child): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'session_message',
    messageId: id,
    senderSessionId: sender,
    recipientSessionId: parent,
    content: content(id, text),
  },
});

const firstReports: ScriptedStep[] = [
  association(child, 'Report reviewer'),
  association(other, 'Other reviewer'),
  ...Array.from({ length: 181 }, (_, index) =>
    report(`report-${index}`, `Finding ${index}`),
  ),
  report('other-report', 'Other Agent finding', other),
  ...Array.from({ length: 160 }, (_, index): ScriptedStep => ({
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: `unrelated-${index}`,
      title: `Unrelated update ${index}`,
      kind: 'other',
      status: 'completed',
      content: [],
    },
  })),
];

export const subagentReports: ScriptedScenario = {
  sessionIds: [parent],
  steps: firstReports,
  responses: {
    'session/prompt': [
      { steps: firstReports },
      {
        steps: [
          report('report-180', 'Finding updated'),
          report('report-0', 'Old finding revised'),
          {
            type: 'update',
            update: {
              sessionUpdate: 'session_message_chunk',
              messageId: 'report-0',
              content: { type: 'text', text: ' and expanded' },
            },
          },
        ],
      },
    ],
  },
};
