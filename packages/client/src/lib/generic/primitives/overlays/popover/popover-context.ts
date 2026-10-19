import { useCallback, useContext } from 'react';
import { createOpenStateContext } from '#primitives/overlays/open-state';

export const [PopoverContext, usePopoverState] =
  createOpenStateContext('Popover');

export function usePopoverClose(): () => void {
  const { onOpenChange } = usePopoverState();

  return useCallback(() => onOpenChange(false), [onOpenChange]);
}

// The popover this part sits in, if any: a popover nested in a menu closes the menu with it.
export function useEnclosingPopoverClose(): (() => void) | undefined {
  const state = useContext(PopoverContext);

  return state ? () => state.onOpenChange(false) : undefined;
}
