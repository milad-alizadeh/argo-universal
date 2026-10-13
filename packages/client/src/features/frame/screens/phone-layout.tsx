import type * as React from 'react';
import type { ReactNode } from 'react';
import type { NavigationDestination } from '#lib/product/navigation/context';
import type { Section } from '../../../lib/product/navigation/sections';
import { PhoneLayoutView } from '../components/phone-layout-view';
import { useAttentionCount } from '../hooks/use-attention-count';

export interface PhoneLayoutProps {
  destination: NavigationDestination;
  // Shows a picked section.
  onSectionChange: (section: Section) => void;
  children: ReactNode;
}

// The phone's shell, with the live attention count; the drawing is `PhoneLayoutView`.
export function PhoneLayout(props: PhoneLayoutProps): React.JSX.Element {
  const attentionCount = useAttentionCount();
  return <PhoneLayoutView {...props} attentionCount={attentionCount} />;
}
