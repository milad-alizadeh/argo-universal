import type {
  RequestPermissionRequest,
  RequestPermissionResponse,
  SessionConfigOption,
  ToolCallUpdate,
} from '@agentclientprotocol/sdk';
import { acpConfiguration } from './acp-configuration.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

// As Claude writes its plan file: a title heading, then the steps.
export const writtenPlan =
  '# Fix the README typo\n\n1. Read README.md\n2. Fix the typo\n';

export const withMode = (mode: string): SessionConfigOption[] =>
  acpConfiguration.map((option) =>
    option.id === 'mode' && option.type === 'select'
      ? { ...option, currentValue: mode }
      : option,
  );

// As claude-agent-acp 0.89 sends ExitPlanMode to an ACP client: a switch_mode Tool call whose content is the plan.
export const leavePlanMode = {
  toolCallId: 'leave-plan-mode',
  title: 'Approve Plan',
  kind: 'switch_mode',
  rawInput: { plan: writtenPlan },
  content: [{ type: 'content', content: { type: 'text', text: writtenPlan } }],
} satisfies ToolCallUpdate;

// claude-agent-acp 0.89's options for ExitPlanMode when auto and bypass modes are off.
export const leavePlanModeOptions: RequestPermissionRequest['options'] = [
  {
    optionId: 'exit-plan-accept-edits',
    name: 'Yes, auto-accept edits',
    kind: 'allow_always',
  },
  {
    optionId: 'exit-plan-default',
    name: 'Yes, manually approve edits',
    kind: 'allow_once',
  },
  { optionId: 'reject', name: 'No, keep planning', kind: 'reject_once' },
];

// The Tool call, then the Permission request; responses records the answer.
export const askToLeavePlanMode = (
  responses: RequestPermissionResponse[] = [],
): ScriptedStep[] => [
  {
    type: 'update',
    update: { sessionUpdate: 'tool_call', ...leavePlanMode, status: 'pending' },
  },
  {
    type: 'permission',
    request: { toolCall: leavePlanMode, options: leavePlanModeOptions },
    responses,
  },
];

// An approved request: the Agent switches to code mode and completes the Tool call.
export const leavePlanModeSteps: ScriptedStep[] = [
  ...askToLeavePlanMode(),
  {
    type: 'update',
    update: {
      sessionUpdate: 'config_option_update',
      configOptions: withMode('code'),
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call_update',
      toolCallId: leavePlanMode.toolCallId,
      status: 'completed',
    },
  },
];

// Claude's request to leave plan mode is an ordinary ACP Permission request with its own options.
export const planModeScenarios = (
  reply: ScriptedStep,
): Record<'leave-plan-mode', ScriptedScenario> => ({
  'leave-plan-mode': {
    configOptions: withMode('plan'),
    steps: [...leavePlanModeSteps, reply],
  },
});
