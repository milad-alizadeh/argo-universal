import type * as WebPopover from '@radix-ui/react-popover';
import type * as React from 'react';
import type { Hover } from './popover-hover';

type FocusProps = Pick<
  React.ComponentProps<typeof WebPopover.Content>,
  'onOpenAutoFocus' | 'onCloseAutoFocus'
> & { onClosed?: () => void };

export function hoverContentProps(
  hover: Hover | undefined,
  props: FocusProps,
): React.ComponentProps<typeof WebPopover.Content> {
  return {
    onPointerEnter: hover?.enter,
    onPointerLeave: hover?.leave,
    ...hoverFocus(hover, props),
  };
}

function hoverFocus(hover: Hover | undefined, props: FocusProps): FocusProps {
  return {
    onOpenAutoFocus: (event) => {
      preventPointerFocus(hover, event);
      props.onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus: (event) => {
      preventPointerFocus(hover, event);
      props.onClosed?.();
      props.onCloseAutoFocus?.(event);
    },
  };
}

function preventPointerFocus(hover: Hover | undefined, event: Event): void {
  if (hover?.isPointer()) event.preventDefault();
}
