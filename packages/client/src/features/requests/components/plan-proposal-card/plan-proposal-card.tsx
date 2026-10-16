import type {
  PendingPlanProposal,
  SessionAnswerPlanProposalInput,
} from '@repo/contracts';
import type * as React from 'react';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { PlanProposalExpansion } from '../plan-proposal-expansion/plan-proposal-expansion';
import { RequestCard, type RequestState } from '../request-card/request-card';
import { PlanProposalActions } from './plan-proposal-actions';
import { approvePlanQuestion, PlanProposalBody } from './plan-proposal-body';
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
  const panel = <ProposalPanel {...props} interaction={interaction} />;

  if (!interaction.expanded) return panel;

  return (
    <ExpandedProposal
      panel={panel}
      bottomInset={props.bottomInset}
      onCollapse={() => interaction.setExpanded(false)}
    />
  );
}

interface ExpandedProposalProps {
  panel: React.JSX.Element;
  bottomInset?: number;
  onCollapse: () => void;
}

// Expanded, a wide window lifts the plan over the Feed; a phone's sheet already holds it.
function ExpandedProposal(props: ExpandedProposalProps): React.JSX.Element {
  return (
    <SizeClass
      compact={props.panel}
      wide={
        <PlanProposalExpansion
          bottomInset={props.bottomInset}
          onCollapse={props.onCollapse}
        >
          {props.panel}
        </PlanProposalExpansion>
      }
    />
  );
}

type PanelProps = PlanProposalCardProps & {
  interaction: PlanProposalInteraction;
};

const panelChrome = {
  surface: 'tray',
  sheetLabel: approvePlanQuestion,
  testID: 'plan-proposal-card',
  mutedStatus: true,
  footerClassName: 'wide:justify-end',
} as const;

const expandedPanel = {
  className:
    'flex-1 min-h-0 max-w-none rounded-t-xl bg-content/80 shadow-glass web:backdrop-blur-glass web:backdrop-saturate-110',
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
