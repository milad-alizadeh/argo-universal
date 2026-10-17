import type {
  RequestPermissionRequest,
  SessionConfigOption,
  ToolCallUpdate,
} from '@agentclientprotocol/sdk';
import { acpConfiguration } from './acp-configuration.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

const writtenPlan = '1. Read README.md\n2. Fix the typo';

const withMode = (mode: string): SessionConfigOption[] =>
  acpConfiguration.map((option) =>
    option.id === 'mode' && option.type === 'select'
      ? { ...option, currentValue: mode }
      : option,
  );

// As claude-agent-acp sends ExitPlanMode: a switch_mode Tool call whose content is the plan.
const leavePlanMode = {
  toolCallId: 'leave-plan-mode',
  title: 'Ready to code?',
  kind: 'switch_mode',
  rawInput: { plan: writtenPlan },
  content: [{ type: 'content', content: { type: 'text', text: writtenPlan } }],
} satisfies ToolCallUpdate;

// claude-agent-acp's options for ExitPlanMode.
const leavePlanModeOptions: RequestPermissionRequest['options'] = [
  {
    optionId: 'acceptEdits',
    name: 'Yes, and auto-accept edits',
    kind: 'allow_always',
  },
  {
    optionId: 'default',
    name: 'Yes, and manually approve edits',
    kind: 'allow_once',
  },
  { optionId: 'plan', name: 'No, keep planning', kind: 'reject_once' },
];

const leavePlanModeSteps: ScriptedStep[] = [
  {
    type: 'update',
    update: { sessionUpdate: 'tool_call', ...leavePlanMode, status: 'pending' },
  },
  {
    type: 'permission',
    request: { toolCall: leavePlanMode, options: leavePlanModeOptions },
  },
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
