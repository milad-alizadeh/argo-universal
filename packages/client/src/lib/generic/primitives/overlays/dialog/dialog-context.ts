import { createContext, useContext } from 'react';
import type { OpenState } from '#primitives/overlays/open-state';

// Whether the dialog is open, for its parts on every platform.
export const DialogContext = createContext<OpenState | null>(null);

export function useDialogState(): OpenState {
  const state = useContext(DialogContext);

  if (!state) throw new Error('Dialog parts render inside a Dialog.');

  return state;
}
