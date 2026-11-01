import { useState, type Dispatch, type SetStateAction } from 'react';
import type { SheetProps } from './sheet-props';
import type { SheetScreenEntry, SheetStack } from './sheet-screens';
import { sheetReports } from './sheet-state';

export type Presentation = Pick<SheetStack, 'path' | 'setPath' | 'reports'> & {
  destinations: SheetScreenEntry[];
  setDestinations: Dispatch<SetStateAction<SheetScreenEntry[]>>;
};

/*
 * Each opening starts on the root page and reports its own close; the old page stays while the sheet slides
 * away. Screens pushed during an opening go with it, since a sheet that kept them would count pages it no
 * longer draws — which is what decides whether Android's sheet fills the window or wraps (owner, 2026-10-20).
 */
export function usePresentation(
  open: boolean,
  latest: () => SheetProps,
): Presentation {
  const [path, setPath] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<SheetScreenEntry[]>([]);
  const [reports, setReports] = useState(() => sheetReports(latest));

  if (useOpening(open)) {
    setPath([]);
    setDestinations([]);
    setReports(sheetReports(latest));
  }

  return { path, setPath, destinations, setDestinations, reports };
}

function useOpening(open: boolean): boolean {
  const [shownOpen, setShownOpen] = useState(open);

  if (open !== shownOpen) setShownOpen(open);

  return open && !shownOpen;
}
