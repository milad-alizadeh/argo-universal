import { PortalHost } from '@rn-primitives/portal';
import { createContext, type ReactNode, useId } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#lib/utils';

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
      <View {...props} className={cn('relative flex-1 min-h-0', className)}>
        {children}
        <PortalHost name={host} />
      </View>
    </PlanProposalHost.Provider>
  );
}
