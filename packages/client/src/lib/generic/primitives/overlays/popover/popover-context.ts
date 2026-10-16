import { createContext, useCallback, useContext } from 'react';
import type { OpenState } from '#primitives/overlays/open-state';

// Whether the popover is open, for its parts on every platform.
export const PopoverContext = createContext<OpenState | null>(null);

export function usePopoverState(): OpenState {
  const state = useContext(PopoverContext);

  if (!state) throw new Error('Popover parts render inside a Popover.');

  return state;
}

export function usePopoverClose(): () => void {
  const { onOpenChange } = usePopoverState();

  return useCallback(() => onOpenChange(false), [onOpenChange]);
}
