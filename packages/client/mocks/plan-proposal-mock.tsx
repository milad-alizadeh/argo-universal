import { recordedRequestMocks } from '@repo/api/mocks';
import { useState } from 'react';
import { View } from 'react-native';
import type { ComposerDraft } from '../src/components/Composer';
import type { PlanProposalCardProps } from '../src/components/PlanProposalCard';
import { PlanProposalRegion } from '../src/components/PlanProposalRegion';
import { Text } from '../src/primitives/text';
import { ComposerMock } from './composer-mock';

export const planProposalMocks = recordedRequestMocks.flatMap((mock) =>
  mock.answer.procedure === 'answerPlanProposal' &&
  mock.pending.snapshot.pendingPlanProposal
    ? [
        {
          proposal: mock.pending.snapshot.pendingPlanProposal,
          answer: mock.answer.input,
        },
      ]
    : [],
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

export function PlanProposalPreview(props: PlanProposalCardProps) {
  const [draft, setDraft] = useState<ComposerDraft>({
    text: 'Keep my draft',
    images: [],
  });
  const [answer, setAnswer] = useState<string>();
  return (
    <View className="flex-1 min-h-0 flex-row">
      <View
        testID="plan-proposal-sidebar"
        className="hidden wide:flex w-56 bg-sidebar border-r border-border p-4"
      >
        <Text className="text-sm font-semibold">Sessions</Text>
      </View>
      <PlanProposalRegion
        testID="plan-proposal-main-content"
        className="relative flex-1 min-h-0 w-full bg-card"
      >
        <View className="flex-1 min-h-0" />
        {answer && (
          <Text role="status" className="px-4 py-2 text-sm">
            {answer}
          </Text>
        )}
        <View className="items-center px-4 pb-4 wide:px-6">
          <ComposerMock
            sessionStarted
            draft={draft}
            onDraftChange={setDraft}
            onAttachImages={() => {}}
            onSend={() => {}}
            planProposal={
              answer
                ? undefined
                : {
                    ...props,
                    onAnswer: (next) => {
                      props.onAnswer(next);
                      setAnswer(
                        next.decision === 'approve'
                          ? 'Plan approved'
                          : `You kept planning: ${next.feedback}`,
                      );
                    },
                  }
            }
          />
        </View>
      </PlanProposalRegion>
      <View
        testID="plan-proposal-inspector"
        className="hidden wide:flex w-64 bg-sidebar border-l border-border p-4"
      >
        <Text className="text-sm font-semibold">Inspector</Text>
      </View>
    </View>
  );
}
