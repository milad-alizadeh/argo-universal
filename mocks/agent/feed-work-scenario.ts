import type { ScriptedStep } from './scripted-scenario.ts';

export const unfinishedFeedWorkSteps: ScriptedStep[] = [
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: 'greeting-edit',
      title: 'Edit greeting.txt',
      kind: 'edit',
      status: 'in_progress',
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call_update',
      toolCallId: 'greeting-edit',
      status: 'completed',
      content: [
        {
          type: 'diff',
          path: 'greeting.txt',
          oldText: 'Hello world\n',
          newText: 'Hello Argo\n',
        },
      ],
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: 'greeting-check',
      title: 'Check greeting',
      kind: 'execute',
      status: 'in_progress',
      rawInput: { command: 'cat greeting.txt' },
    },
  },
];

export const feedWorkSteps: ScriptedStep[] = [
  ...unfinishedFeedWorkSteps,
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call_update',
      toolCallId: 'greeting-check',
      status: 'completed',
      content: [
        {
          type: 'content',
          content: { type: 'text', text: 'Greeting check passed' },
        },
      ],
    },
  },
];

export const feedWorkReplySteps: ScriptedStep[] = [
  ...feedWorkSteps,
  {
    type: 'update',
    update: {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'The greeting is updated.' },
    },
  },
];
