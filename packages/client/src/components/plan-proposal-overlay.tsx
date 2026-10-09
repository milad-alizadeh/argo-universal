import * as DialogPrimitive from '@rn-primitives/dialog';
import { Portal } from '@rn-primitives/portal';
import type * as React from 'react';
import { type ReactNode, useContext, useId } from 'react';
import { useWide } from '../navigation/use-wide';
import { PlanProposalHost } from './plan-proposal-region';

export interface PlanProposalExpansionProps {
  onCollapse: () => void;
  children: ReactNode;
}

export function PlanProposalOverlay({
  onCollapse,
  children,
}: PlanProposalExpansionProps): React.JSX.Element {
  const host = useContext(PlanProposalHost);
  const name = useId();
  const wide = useWide();
  return (
    <Portal hostName={wide ? host : undefined} name={name}>
      <DialogPrimitive.Root
        open
        onOpenChange={(open) => {
          if (!open) onCollapse();
        }}
        className={`${wide ? 'absolute inset-6' : 'web:fixed absolute inset-0 bg-popover pb-8.5'} z-50 [&>[role=dialog]]:flex [&>[role=dialog]]:flex-1 [&>[role=dialog]]:min-h-0 [&>[role=dialog]]:outline-none`}
      >
        <DialogPrimitive.Content
          className="flex-1 min-h-0"
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            Expanded plan
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Review the proposed plan and approve it or keep planning with
            feedback.
          </DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Root>
    </Portal>
  );
}
