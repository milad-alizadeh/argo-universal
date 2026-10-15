import type * as React from 'react';
import {
  PhoneDrawerContent,
  type PhoneDrawerContentProps,
} from '../components/phone-drawer-content/phone-drawer-content';
import { useAttentionCount } from '../hooks/use-attention-count';

export type SectionDrawerProps = Omit<
  PhoneDrawerContentProps,
  'attentionCount'
>;

// The phone's drawer of sections, with the live attention count; the drawing is `PhoneDrawerContent`.
export function SectionDrawer(props: SectionDrawerProps): React.JSX.Element {
  return <PhoneDrawerContent {...props} attentionCount={useAttentionCount()} />;
}
