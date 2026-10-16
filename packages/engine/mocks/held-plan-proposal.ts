import {
  planProposalOptions,
  planToolCallId,
  proposedPlan,
} from '@repo/mocks/agent/plan-proposal-scenario';
import type { HeldPlanProposal } from '../src/sessions';

// The Plan proposal the Engine holds for the scripted Agent's request to leave plan mode.
export const heldPlanProposal = (requestId: string): HeldPlanProposal => ({
  requestId,
  toolCallId: planToolCallId,
  content: proposedPlan,
  approve: planProposalOptions.approve,
  keepPlanning: planProposalOptions.keepPlanning,
});
