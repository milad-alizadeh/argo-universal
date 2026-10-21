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
    onPointerEnter: hover && (() => hover.enter('content')),
    onPointerLeave: hover && (() => hover.leave('content')),
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
      keepFocusMovedAway(event);
      props.onClosed?.();
      props.onCloseAutoFocus?.(event);
    },
  };
}

/*
 * A popover still closing when the reader opens another control leaves focus there: Radix would pull it back
 * to this trigger and close that control's popover. The closed content is already gone from the page, so
 * focus that was inside it now sits on the body.
 */
function keepFocusMovedAway(event: Event): void {
  const focused = document.activeElement;

  if (focused && focused !== document.body) event.preventDefault();
}

function preventPointerFocus(hover: Hover | undefined, event: Event): void {
  if (hover?.isPointer()) event.preventDefault();
}
