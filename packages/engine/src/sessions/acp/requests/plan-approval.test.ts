import type { RequestPermissionRequest } from '@agentclientprotocol/sdk';
import { describe, expect, it } from 'vitest';
import { toPlanApproval } from './plan-approval';

const plan = '1. Read the README\n2. Fix the typo';

// The options Claude's ExitPlanMode offers over ACP.
const exitPlanOptions: RequestPermissionRequest['options'] = [
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

const exitPlan = (
  toolCall: Partial<RequestPermissionRequest['toolCall']>,
  options = exitPlanOptions,
): RequestPermissionRequest => ({
  sessionId: 'acp-1',
  toolCall: {
    toolCallId: 'exit-plan',
    title: 'Approve Plan',
    kind: 'switch_mode',
    ...toolCall,
  },
  options,
});

const approval = {
  requestId: 'request-1',
  toolCallId: 'exit-plan',
  content: plan,
  approve: exitPlanOptions[1],
  keepPlanning: exitPlanOptions[2],
};

describe('a Permission request to leave plan mode', (): void => {
  it.each([
    ['its raw input', { rawInput: { plan } }],
    [
      'its displayed content',
      { content: [{ type: 'content', content: { type: 'text', text: plan } }] },
    ],
  ] satisfies [string, Partial<RequestPermissionRequest['toolCall']>][])(
    'is a Plan proposal with the plan from %s',
    (_, toolCall): void => {
      expect(toPlanApproval('request-1', exitPlan(toolCall))).toEqual(approval);
    },
  );

  it.each([
    ['is not a mode switch', { kind: 'edit', rawInput: { plan } }],
    ['carries no plan', { rawInput: { plan: '  ' } }],
  ] satisfies [string, Partial<RequestPermissionRequest['toolCall']>][])(
    'stays a Permission request when it %s',
    (_, toolCall): void => {
      expect(toPlanApproval('request-1', exitPlan(toolCall))).toBeNull();
    },
  );

  it.each([
    ['allow once', 'reject_once'],
    ['reject once', 'allow_once'],
  ] as const)(
    'stays a Permission request without an option to %s',
    (_, kept): void => {
      const options = exitPlanOptions.filter((option) => option.kind === kept);

      expect(
        toPlanApproval('request-1', exitPlan({ rawInput: { plan } }, options)),
      ).toBeNull();
    },
  );
});
