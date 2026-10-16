import type { RequestPermissionRequest } from '@agentclientprotocol/sdk';
import { planProposalOptions } from '@repo/mocks/agent/plan-proposal-scenario';
import { describe, expect, it } from 'vitest';
import { toHeldPlanProposal } from './plan-proposal';

const plan = '1. Read the README\n2. Fix the typo';

const options = Object.values(planProposalOptions);

const leavePlanMode = (
  toolCall: Partial<RequestPermissionRequest['toolCall']>,
  offered = options,
): RequestPermissionRequest => ({
  sessionId: 'acp-1',
  toolCall: {
    toolCallId: 'leave-plan-mode',
    title: 'Approve Plan',
    kind: 'switch_mode',
    ...toolCall,
  },
  options: offered,
});

const proposal = {
  requestId: 'request-1',
  toolCallId: 'leave-plan-mode',
  content: plan,
  approve: planProposalOptions.approve,
  keepPlanning: planProposalOptions.keepPlanning,
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
      expect(toHeldPlanProposal('request-1', leavePlanMode(toolCall))).toEqual(
        proposal,
      );
    },
  );

  it.each([
    ['is not a mode switch', { kind: 'edit', rawInput: { plan } }],
    ['carries no plan', { rawInput: { plan: '  ' } }],
  ] satisfies [string, Partial<RequestPermissionRequest['toolCall']>][])(
    'stays a Permission request when it %s',
    (_, toolCall): void => {
      expect(
        toHeldPlanProposal('request-1', leavePlanMode(toolCall)),
      ).toBeNull();
    },
  );

  it.each([
    ['allow once', 'reject_once'],
    ['reject once', 'allow_once'],
  ] as const)(
    'stays a Permission request without an option to %s',
    (_, kept): void => {
      const remaining = options.filter((option) => option.kind === kept);

      expect(
        toHeldPlanProposal(
          'request-1',
          leavePlanMode({ rawInput: { plan } }, remaining),
        ),
      ).toBeNull();
    },
  );
});
