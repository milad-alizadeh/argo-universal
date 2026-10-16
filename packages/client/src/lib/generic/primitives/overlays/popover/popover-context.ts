import { useCallback } from 'react';
import { createOpenStateContext } from '#primitives/overlays/open-state';

export const [PopoverContext, usePopoverState] =
  createOpenStateContext('Popover');

export function usePopoverClose(): () => void {
  const { onOpenChange } = usePopoverState();

  return useCallback(() => onOpenChange(false), [onOpenChange]);
}
