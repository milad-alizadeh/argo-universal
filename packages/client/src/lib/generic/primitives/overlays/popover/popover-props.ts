import type * as PopoverPrimitive from '@rn-primitives/popover';
import type * as React from 'react';

export type PopoverProps = React.ComponentProps<
  typeof PopoverPrimitive.Root
> & {
  open?: boolean;
  // Web only: phones have no pointer to hover with, so a press opens it.
  openOnHover?: boolean;
};

export type PopoverTriggerProps = React.ComponentProps<
  typeof PopoverPrimitive.Trigger
>;

/*
 * The library's content props, whose own notes mark the few that only the web or only phones
 * read, such as the web's focus and Escape handlers.
 */
export type PopoverContentProps = Omit<
  React.ComponentProps<typeof PopoverPrimitive.Content>,
  'ref' | 'side'
> & {
  // Phones open it only above or below the trigger: `left` and `right` open below there.
  side?: 'top' | 'bottom' | 'left' | 'right';
  // Native only: the web portals into the document body.
  portalHost?: string;
  onClosed?: () => void;
};
