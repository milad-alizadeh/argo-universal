import type * as React from 'react';
import type { PopoverAnchorProps } from './popover-props';

// Phones show the content in a Sheet, which has no anchor.
export function PopoverAnchor(props: PopoverAnchorProps): React.ReactNode {
  return props.children;
}
