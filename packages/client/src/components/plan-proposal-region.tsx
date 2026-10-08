import { PortalHost } from '@rn-primitives/portal';
import { createContext, type ReactNode, useId } from 'react';
import type { ViewProps } from 'react-native';
import { cn } from '#lib/utils';
import { ContentLayout } from './content-layout';

export const PlanProposalHost = createContext<string | undefined>(undefined);

// Wrap the main content so expanding a proposal covers the Feed without covering the other columns.
export function PlanProposalRegion({
  children,
  className,
  ...props
}: ViewProps & { children: ReactNode }) {
  const host = useId();
  return (
    <PlanProposalHost.Provider value={host}>
      <ContentLayout {...props} className={cn('relative', className)}>
        {children}
        <PortalHost name={host} />
      </ContentLayout>
    </PlanProposalHost.Provider>
  );
}
