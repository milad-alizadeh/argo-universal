import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { RequestAction } from '../request-card/request-card';
import type { PlanProposalCardProps } from './plan-proposal-card';
import type { PlanProposalInteraction } from './use-plan-proposal';

export function PlanProposalActions({
  interaction,
  state,
}: {
  interaction: PlanProposalInteraction;
  state: PlanProposalCardProps['state'];
}): ReactNode {
  const wide = useContentWide();
  const inactive = state.kind !== 'open';
  return (
    <View className={wide ? 'flex-row gap-2' : 'w-full flex-col-reverse gap-2'}>
      <RequestAction
        disabled={inactive}
        onPress={() => interaction.setPlanning(!interaction.planning)}
      >
        {interaction.planning ? 'Back' : 'Keep planning'}
      </RequestAction>
      <RequestAction
        primary
        loading={state.kind === 'submitting'}
        disabled={
          inactive || (interaction.planning && !interaction.feedback.trim())
        }
        onPress={interaction.submit}
      >
        {answerLabel(state.kind, interaction.planning)}
      </RequestAction>
    </View>
  );
}

function answerLabel(
  state: PlanProposalCardProps['state']['kind'],
  planning: boolean,
): string {
  if (state === 'submitting') return 'Sending…';
  return planning ? 'Keep planning' : 'Approve';
}
