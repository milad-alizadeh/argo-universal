import type { ReactNode } from 'react';
import { View } from 'react-native';
import { RequestAction } from '../request-card/request-card';
import type { PlanProposalCardProps } from './plan-proposal-card';
import { answerable, type PlanProposalInteraction } from './use-plan-proposal';

interface ActionsProps {
  interaction: PlanProposalInteraction;
  state: PlanProposalCardProps['state'];
}

export function PlanProposalActions(props: ActionsProps): ReactNode {
  return (
    <View className="w-full flex-col-reverse gap-2 wide:w-auto wide:flex-row">
      <PlanningToggle {...props} />
      <AnswerAction {...props} />
    </View>
  );
}

function PlanningToggle({ interaction, state }: ActionsProps): ReactNode {
  return (
    <RequestAction
      disabled={state.kind !== 'open'}
      onPress={() => interaction.setPlanning(!interaction.planning)}
    >
      {interaction.planning ? 'Back' : 'Keep planning'}
    </RequestAction>
  );
}

function AnswerAction({ interaction, state }: ActionsProps): ReactNode {
  return (
    <RequestAction
      primary
      loading={state.kind === 'submitting'}
      disabled={!answerable(state, interaction)}
      onPress={interaction.submit}
    >
      {answerLabel(state.kind, interaction.planning)}
    </RequestAction>
  );
}

function answerLabel(
  state: PlanProposalCardProps['state']['kind'],
  planning: boolean,
): string {
  if (state === 'submitting') return 'Sending…';
  return planning ? 'Keep planning' : 'Approve';
}
