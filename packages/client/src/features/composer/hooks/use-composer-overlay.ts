import { type Dispatch, type SetStateAction, useState } from 'react';
import { useScreenFocused } from '#lib/product/navigation/navigation';

type OverlayState = [boolean, Dispatch<SetStateAction<boolean>>];

// A retained Session keeps its draft, but leaving it closes its transient Composer overlays.
export function useComposerOverlay(disabled?: boolean | null): OverlayState {
  const state = useState(false);
  const available = useScreenFocused() && !disabled;

  if (!available) close(state);

  return state;
}

function close([open, setOpen]: OverlayState): void {
  if (open) setOpen(false);
}
