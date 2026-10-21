import * as WebPopover from '@radix-ui/react-popover';
import type * as React from 'react';
import type { PopoverAnchorProps } from './popover-props';
import { useAnchorElement } from './popover-trigger-element';

// Radix's Anchor places the content against another control, for a popover a menu opens rather than its own trigger.
export function PopoverAnchor(props: PopoverAnchorProps): React.JSX.Element {
  return (
    <WebPopover.Anchor asChild>
      <div ref={useAnchorElement()} className="flex flex-col self-start">
        {props.children}
      </div>
    </WebPopover.Anchor>
  );
}
