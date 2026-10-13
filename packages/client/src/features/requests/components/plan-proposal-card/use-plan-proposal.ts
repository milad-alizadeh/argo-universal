import { useState } from 'react';
import type {
  PlanProposalAnswer,
  PlanProposalCardProps,
} from './plan-proposal-card';

interface ProposalDraft {
  planning: boolean;
  setPlanning: (planning: boolean) => void;
  feedback: string;
  setFeedback: (feedback: string) => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

export interface PlanProposalInteraction extends ProposalDraft {
  submit: () => void;
  back: () => void;
}

export function usePlanProposal(
  props: PlanProposalCardProps,
): PlanProposalInteraction {
  const draft = useProposalDraft();

  return {
    ...draft,
    submit: (): void => submitProposal(props, draft),
    back: (): void =>
      draft.planning ? draft.setPlanning(false) : draft.setExpanded(false),
  };
}

export function answerable(
  state: PlanProposalCardProps['state'],
  { planning, feedback }: Pick<ProposalDraft, 'planning' | 'feedback'>,
): boolean {
  return state.kind === 'open' && !(planning && !feedback.trim());
}

function useProposalDraft(): ProposalDraft {
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
  };
}

function submitProposal(
  props: PlanProposalCardProps,
  draft: ProposalDraft,
): void {
  if (!answerable(props.state, draft)) return;
  draft.setExpanded(false);
  props.onAnswer(proposalAnswer(props.proposal.planId, draft));
}

function proposalAnswer(
  planId: string,
  { planning, feedback }: ProposalDraft,
): PlanProposalAnswer {
  return planning
    ? { planId, decision: 'keep_planning', feedback }
    : { planId, decision: 'approve' };
}
