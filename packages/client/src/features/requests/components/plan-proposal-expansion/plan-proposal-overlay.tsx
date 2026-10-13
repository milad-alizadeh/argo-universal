import type * as React from 'react';
import { type ReactNode, useContext } from 'react';
import { DialogRegion } from '#primitives/overlays/dialog/dialog-region';
import { PlanProposalHost } from '../plan-proposal-region';

export interface PlanProposalExpansionProps {
  onCollapse: () => void;
  children: ReactNode;
  bottomInset?: number;
}

export function PlanProposalOverlay(
  props: PlanProposalExpansionProps,
): React.JSX.Element {
  return (
    <DialogRegion
      hostName={useContext(PlanProposalHost)}
      label="Expanded plan"
      description="Review the proposed plan and approve it or keep planning with feedback."
      onClose={props.onCollapse}
      bottomInset={props.bottomInset}
    >
      {props.children}
    </DialogRegion>
  );
}
