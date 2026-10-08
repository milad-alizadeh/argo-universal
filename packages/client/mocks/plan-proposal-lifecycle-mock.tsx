import { useState } from 'react';
import type { PlanProposalCardProps } from '../src/components/PlanProposalCard';
import { PlanProposalPreview } from './plan-proposal-mock';

export function PlanProposalAnswerPreview(
  props: PlanProposalCardProps,
): ReturnType<typeof PlanProposalPreview> {
  return (
    <PlanProposalPreview {...useAnswerState(props)} retainProposalAfterAnswer />
  );
}

function useAnswerState(props: PlanProposalCardProps): PlanProposalCardProps {
  const [state, setState] = useState(props.state);
  return {
    ...props,
    state,
    onAnswer: (answer) => {
      props.onAnswer(answer);
      setState({ kind: 'submitting' });
    },
  };
}
