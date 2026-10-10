import type * as React from 'react';
import type { ReactNode } from 'react';
import type { NavigationDestination } from '#lib/product/navigation/context';
import { PhoneLayoutView } from '../components/phone-layout-view';
import { useAttentionCount } from '../hooks/use-attention-count';

export interface PhoneLayoutProps {
  destination: NavigationDestination;
  children: ReactNode;
}

// The phone's shell, with the live attention count; the drawing is `PhoneLayoutView`.
export function PhoneLayout({
  destination,
  children,
}: PhoneLayoutProps): React.JSX.Element {
  const attentionCount = useAttentionCount();
  return (
    <PhoneLayoutView destination={destination} attentionCount={attentionCount}>
      {children}
    </PhoneLayoutView>
  );
}
