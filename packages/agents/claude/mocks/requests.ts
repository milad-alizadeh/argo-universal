import type {
  AskUserQuestionInput,
  BashInput,
  ExitPlanModeInput,
} from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import type { SDKControlRequest } from '../messages';

export const permission = {
  type: 'control_request',
  request_id: 'permission',
  request: {
    subtype: 'can_use_tool',
    tool_name: 'Bash',
    input: { command: 'ls' } satisfies BashInput,
    permission_suggestions: [],
    tool_use_id: 'tool',
  },
} satisfies SDKControlRequest;

export const plan = {
  ...permission,
  request: {
    ...permission.request,
    tool_name: 'ExitPlanMode',
    input: {
      plan: 'Ship the change.',
      planFilePath: '/repo/plan.md',
    } satisfies ExitPlanModeInput,
  },
} satisfies SDKControlRequest;

export const question = {
  ...permission,
  request: {
    ...permission.request,
    tool_name: 'AskUserQuestion',
    input: {
      questions: [
        {
          header: 'Color',
          question: 'Choose a color',
          multiSelect: false,
          options: [
            { label: 'Red', description: 'A red square' },
            { label: 'Blue', description: 'A blue circle' },
          ],
        },
      ],
    } satisfies AskUserQuestionInput,
  },
} satisfies SDKControlRequest;
