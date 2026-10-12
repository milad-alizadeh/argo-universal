import type * as React from 'react';
import { type ReactNode, useContext } from 'react';
import { DialogRegion } from '#primitives/overlays/dialog/dialog-region';
import { PlanProposalHost } from '../plan-proposal-region';

export interface PlanProposalExpansionProps {
  onCollapse: () => void;
  children: ReactNode;
}

export function PlanProposalOverlay({
  onCollapse,
  children,
}: PlanProposalExpansionProps): React.JSX.Element {
  return (
    <DialogRegion
      hostName={useContext(PlanProposalHost)}
      label="Expanded plan"
      description="Review the proposed plan and approve it or keep planning with feedback."
      onClose={onCollapse}
    >
      {children}
    </DialogRegion>
  );
}
