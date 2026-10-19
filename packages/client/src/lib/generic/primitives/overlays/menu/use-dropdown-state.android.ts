import { useState } from 'react';
import { useMaterialPalette } from '#primitives/native/material-palette';

interface DropdownState {
  expanded: boolean;
  open: () => void;
  close: () => void;
  // The menu's container colour, Material's surface container; missing until Uniwind resolves it.
  color: string | undefined;
}

// A stock Compose DropdownMenu is controlled: `expanded` shows it, and its caller opens and closes it.
export function useDropdownState(): DropdownState {
  const [expanded, setExpanded] = useState(false);
  const color = useMaterialPalette().roles.surfaceContainer;

  return {
    expanded,
    open: () => setExpanded(true),
    close: () => setExpanded(false),
    color,
  };
}
