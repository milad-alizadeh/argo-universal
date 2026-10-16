import { type Dispatch, type SetStateAction, useState } from 'react';
import { useCentresOverlays } from '#primitives/overlays/centred-overlay';
import { useDialogState } from './dialog-context';
import type { DialogPresentation } from './dialog-props';

// SwiftUI must finish dismissing its Sheet before another controller can present the centred Dialog.
export function useDialogPresentation(): DialogPresentation {
  const { open } = useDialogState();
  const requestedCentred = useCentresOverlays();
  const [centred, setCentred] = useState(requestedCentred);

  if (canChangeDrawing(open, requestedCentred))
    alignDrawing(centred, requestedCentred, setCentred);

  return {
    centred,
    sheetOpen: open && !requestedCentred,
    onSheetClosed: () => setCentred(requestedCentred),
  };
}

// Closing the Dialog or returning to a Sheet needs no Sheet-to-Dialog hand-off.
function canChangeDrawing(open: boolean, centred: boolean): boolean {
  return !open || !centred;
}

function alignDrawing(
  shown: boolean,
  requested: boolean,
  setCentred: Dispatch<SetStateAction<boolean>>,
): void {
  if (shown !== requested) setCentred(requested);
}
