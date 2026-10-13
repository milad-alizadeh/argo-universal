import type { ScriptedStep } from './scripted-scenario.ts';

const messageCount = 90;

const historyPair = (index: number): ScriptedStep[] => [
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: `history-${index}`,
      title: `Read history ${index}`,
      kind: 'read',
      status: 'completed',
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'agent_message_chunk',
      messageId: `history-message-${index}`,
      content: { type: 'text', text: `History message ${index}.` },
    },
  },
];

export const feedHistorySteps: ScriptedStep[] = [
  ...Array.from({ length: messageCount }, (_, index) =>
    historyPair(index + 1),
  ).flat(),
  {
    type: 'update',
    update: {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'Latest history reply.' },
    },
  },
];
