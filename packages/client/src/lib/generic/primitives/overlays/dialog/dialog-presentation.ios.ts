import { type Dispatch, type SetStateAction, useState } from 'react';
import { useWide } from '../../../use-wide/use-wide';
import { useDialogState } from './dialog-context';
import type { DialogPresentation } from './dialog-props';

// SwiftUI must finish dismissing its Sheet before another controller can present the centred Dialog.
export function useDialogPresentation(): DialogPresentation {
  const { open } = useDialogState();
  const requestedWide = useWide();
  const [wide, setWide] = useState(requestedWide);

  if (canChangeDrawing(open, requestedWide))
    alignDrawing(wide, requestedWide, setWide);

  return {
    wide,
    sheetOpen: open && !requestedWide,
    onSheetClosed: () => setWide(requestedWide),
  };
}

// Closing the Dialog or returning to a Sheet needs no Sheet-to-Dialog hand-off.
function canChangeDrawing(open: boolean, wide: boolean): boolean {
  return !open || !wide;
}

function alignDrawing(
  shown: boolean,
  requested: boolean,
  setWide: Dispatch<SetStateAction<boolean>>,
): void {
  if (shown !== requested) setWide(requested);
}
