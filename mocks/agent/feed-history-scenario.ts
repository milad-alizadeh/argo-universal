import { acpConfiguration } from './acp-configuration.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

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

const historySteps = Array.from({ length: messageCount }, (_, index) =>
  historyPair(index + 1),
).flat();

export const continuedHistoryPrompt = 'Continue after paging history';

export const continuedHistoryReply = 'History continued in the live Turn.';

const feedHistorySteps = (reply = 'Latest history reply.'): ScriptedStep[] => [
  ...historySteps,
  {
    type: 'update',
    update: {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: reply },
    },
  },
];

export const feedHistoryScenario: ScriptedScenario = {
  configOptions: acpConfiguration,
  steps: feedHistorySteps(),
  responses: {
    'session/prompt': [
      {
        prompt: continuedHistoryPrompt,
        steps: feedHistorySteps(continuedHistoryReply),
      },
    ],
  },
};
