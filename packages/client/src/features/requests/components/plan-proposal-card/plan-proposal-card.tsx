import type {
  PendingPlanProposal,
  SessionAnswerPlanProposalInput,
} from '@repo/contracts';
import type * as React from 'react';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { PlanProposalExpansion } from '../plan-proposal-expansion/plan-proposal-expansion';
import { RequestCard, type RequestState } from '../request-card/request-card';
import { PlanProposalActions } from './plan-proposal-actions';
import { PlanProposalBody } from './plan-proposal-body';
import { usePlanProposal } from './use-plan-proposal';

type PlanProposalAnswer =
  | Omit<
      Extract<SessionAnswerPlanProposalInput, { decision: 'approve' }>,
      'sessionId'
    >
  | Omit<
      Extract<SessionAnswerPlanProposalInput, { decision: 'keep_planning' }>,
      'sessionId'
    >;

export interface PlanProposalCardProps {
  proposal: PendingPlanProposal;
  onAnswer: (answer: PlanProposalAnswer) => void;
  state: RequestState;
  error?: string;
  bottomInset?: number;
}

export function PlanProposalCard(
  props: PlanProposalCardProps,
): React.JSX.Element {
  return <ProposalInteraction key={props.proposal.planId} {...props} />;
}

function ProposalInteraction(props: PlanProposalCardProps): React.JSX.Element {
  const interaction = usePlanProposal(props);
  const wide = useWide();
  const panel = <ProposalPanel {...props} interaction={interaction} />;
  if (!wide || !interaction.expanded) return panel;
  return (
    <PlanProposalExpansion
      bottomInset={props.bottomInset}
      onCollapse={() => interaction.setExpanded(false)}
    >
      {panel}
    </PlanProposalExpansion>
  );
}

function ProposalPanel(
  props: PlanProposalCardProps & {
    interaction: ReturnType<typeof usePlanProposal>;
  },
): React.JSX.Element {
  const { interaction } = props;
  return (
    <RequestCard
      surface="tray"
      state={props.state}
      error={props.error}
      onEnter={interaction.submit}
      onEscape={interaction.back}
      sheetLabel="Plan proposal"
      testID="plan-proposal-card"
      mutedStatus
      className={
        interaction.expanded
          ? 'flex-1 min-h-0 max-w-none rounded-t-xl bg-sidebar/80 shadow-glass web:backdrop-blur-glass web:backdrop-saturate-110'
          : undefined
      }
      bodyClassName={interaction.expanded ? 'flex-1 min-h-0' : undefined}
      footerClassName="wide:justify-end"
      actions={
        <PlanProposalActions interaction={interaction} state={props.state} />
      }
    >
      <PlanProposalBody {...props} />
    </RequestCard>
  );
}
