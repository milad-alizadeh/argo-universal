import type {
  PermissionOption,
  ToolCallUpdate,
} from '@agentclientprotocol/sdk';
import type { ScriptedStep } from './scripted-scenario.ts';

export const proposedPlan = '1. Read README.md\n2. Fix the typo in its title';

export const planToolCallId = 'leave-plan-mode';

const leavePlanMode = {
  toolCallId: planToolCallId,
  title: 'Approve Plan',
  kind: 'switch_mode',
  rawInput: { plan: proposedPlan },
  content: [{ type: 'content', content: { type: 'text', text: proposedPlan } }],
} satisfies ToolCallUpdate;

// The options Claude's ExitPlanMode offers over ACP.
export const planProposalOptions = {
  acceptEdits: {
    optionId: 'exit-plan-accept-edits',
    name: 'Yes, auto-accept edits',
    kind: 'allow_always',
  },
  approve: {
    optionId: 'exit-plan-default',
    name: 'Yes, manually approve edits',
    kind: 'allow_once',
  },
  keepPlanning: {
    optionId: 'reject',
    name: 'No, keep planning',
    kind: 'reject_once',
  },
} as const satisfies Record<string, PermissionOption>;

const proposing: ScriptedStep = {
  type: 'update',
  update: { sessionUpdate: 'tool_call', ...leavePlanMode, status: 'pending' },
};

type PlanRequestStep = Extract<ScriptedStep, { type: 'permission' }>;

// A plan-mode Turn ending in a Plan proposal: a Permission request to leave plan mode carrying the plan.
export const planProposalSteps = (
  step: Pick<PlanRequestStep, 'responses' | 'detached' | 'signal'> = {},
): ScriptedStep[] => [
  proposing,
  {
    type: 'permission',
    request: {
      toolCall: leavePlanMode,
      options: Object.values(planProposalOptions),
    },
    ...step,
  },
];
