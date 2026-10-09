import { recordedRequestMocks } from '@repo/mocks/app';
import type * as React from 'react';
import { View } from 'react-native';
import {
  PlanProposalCard,
  type PlanProposalCardProps,
} from '../src/components/plan-proposal-card';
import { PlanProposalRegion } from '../src/components/plan-proposal-region';
import { Text } from '../src/primitives/text';

export const planProposalMocks = recordedRequestMocks.flatMap((mock) =>
  mock.answer.procedure === 'answerPlanProposal' &&
  mock.pending.snapshot.pendingPlanProposal
    ? [
        {
          agent: mock.agent,
          proposal: mock.pending.snapshot.pendingPlanProposal,
          answer: mock.answer.input,
        },
      ]
    : [],
);

if (
  planProposalMocks[0]?.agent !== 'agent-1' ||
  planProposalMocks[2]?.agent !== 'agent-2'
)
  throw new Error(
    'Recorded catalog needs Plan proposal answers for both Agents.',
  );

const shortMock = planProposalMocks.at(-2);
if (!shortMock) throw new Error('Plan proposal recording is missing.');
export const shortPlanProposal = shortMock.proposal;
export const longPlanProposal = {
  ...shortMock.proposal,
  content: planProposalMocks
    .map(({ proposal }) => proposal.content)
    .join('\n\n')
    .repeat(4),
};
export const planProposalFeedback =
  planProposalMocks.find(({ answer }) => answer.decision === 'keep_planning')
    ?.answer.feedback ?? '';

export function PlanProposalPreview(
  props: PlanProposalCardProps,
): React.JSX.Element {
  return (
    <View className="flex-1 min-h-0 flex-row">
      <View className="hidden wide:flex w-56 bg-sidebar border-r border-border p-4">
        <Text className="text-sm font-semibold">Sessions</Text>
      </View>
      <PlanProposalRegion
        testID="plan-proposal-main-content"
        className="relative flex-1 min-h-0 w-full bg-card"
      >
        <View className="flex-1 min-h-0" />
        <View className="items-center px-4 pb-4 wide:px-6">
          <PlanProposalCard {...props} />
        </View>
      </PlanProposalRegion>
      <View className="hidden wide:flex w-64 bg-sidebar border-l border-border p-4">
        <Text className="text-sm font-semibold">Inspector</Text>
      </View>
    </View>
  );
}
