import { useState } from 'react';
import type { PlanProposalCardProps } from './plan-proposal-card';

export interface PlanProposalInteraction {
  planning: boolean;
  setPlanning: (planning: boolean) => void;
  feedback: string;
  setFeedback: (feedback: string) => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  submit: () => void;
  back: () => void;
}

export function usePlanProposal(
  props: PlanProposalCardProps,
): PlanProposalInteraction {
  const [planning, setPlanning] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [expanded, setExpanded] = useState(false);
  return {
    planning,
    setPlanning,
    feedback,
    setFeedback,
    expanded,
    setExpanded,
    submit: (): void =>
      submitProposal({ ...props, planning, feedback, setExpanded }),
    back: (): void => (planning ? setPlanning(false) : setExpanded(false)),
  };
}

function submitProposal(
  props: PlanProposalCardProps & {
    planning: boolean;
    feedback: string;
    setExpanded: (expanded: boolean) => void;
  },
): void {
  if (props.state.kind !== 'open' || (props.planning && !props.feedback.trim()))
    return;
  props.setExpanded(false);
  const planId = props.proposal.planId;
  props.onAnswer(
    props.planning
      ? { planId, decision: 'keep_planning', feedback: props.feedback }
      : { planId, decision: 'approve' },
  );
}
