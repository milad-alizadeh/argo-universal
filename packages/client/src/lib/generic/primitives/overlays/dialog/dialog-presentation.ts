import { useCentresOverlays } from '#primitives/overlays/centred-overlay';
import { useDialogState } from './dialog-context';
import type { DialogPresentation } from './dialog-props';

export function useDialogPresentation(): DialogPresentation {
  return { centred: useCentresOverlays(), sheetOpen: useDialogState().open };
}
