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
import {
  type PlanProposalInteraction,
  usePlanProposal,
} from './use-plan-proposal';

export type PlanProposalAnswer =
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

type PanelProps = PlanProposalCardProps & {
  interaction: PlanProposalInteraction;
};

const panelChrome = {
  surface: 'tray',
  sheetLabel: 'Plan proposal',
  testID: 'plan-proposal-card',
  mutedStatus: true,
  footerClassName: 'wide:justify-end',
} as const;

const expandedPanel = {
  className:
    'flex-1 min-h-0 max-w-none rounded-t-xl bg-sidebar/80 shadow-glass web:backdrop-blur-glass web:backdrop-saturate-110',
  bodyClassName: 'flex-1 min-h-0',
};

function ProposalPanel(props: PanelProps): React.JSX.Element {
  return (
    <RequestCard
      {...panelChrome}
      {...(props.interaction.expanded && expandedPanel)}
      state={props.state}
      error={props.error}
      onEnter={props.interaction.submit}
      onEscape={props.interaction.back}
      actions={<PlanProposalActions {...props} />}
    >
      <PlanProposalBody {...props} />
    </RequestCard>
  );
}
