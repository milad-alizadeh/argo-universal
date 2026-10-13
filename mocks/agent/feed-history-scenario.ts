import type { ScriptedStep } from './scripted-scenario.ts';

const messageCount = 180;

const historyTool = (index: number): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'tool_call',
    toolCallId: `history-${index}`,
    title: `Read history ${index}`,
    kind: 'read',
    status: 'completed',
  },
});
const historyMessage = (index: number): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'agent_message_chunk',
    messageId: `history-message-${index}`,
    content: { type: 'text', text: `History message ${index}.` },
  },
});
const historyPair = (index: number): ScriptedStep[] => [
  historyTool(index),
  historyMessage(index),
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
