import {
  useLayoutEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { SheetDestination } from './sheet-props';
import type { SheetScreenEntry } from './sheet-screens';
import { pushScreen } from './sheet-state';

type SetScreens = Dispatch<SetStateAction<SheetScreenEntry[]>>;

type SetPath = Dispatch<SetStateAction<string[]>>;

/*
 * Where a page sits in the sheet is settled the first time the sheet is given it and never moves while the
 * sheet is open: a page the reader has already slid to would slide out from under them if a later page
 * took its place in the row.
 */
function placedScreen(
  current: SheetScreenEntry[],
  page: SheetDestination,
): SheetScreenEntry[] {
  const entry = { ...page, content: page.children };

  return current.some((held) => held.name === page.name)
    ? current.map((held) => (held.name === page.name ? entry : held))
    : [...current, entry];
}

// A choice page follows its owner's current props, including availability and loading changes.
export function updateDestination(
  setScreens: SetScreens,
  page: SheetDestination,
): void {
  setScreens((current) =>
    current.some((entry) => entry.name === page.name)
      ? placedScreen(current, page)
      : current,
  );
}

/*
 * A page the sheet carries without showing: it takes its place in the row while the sheet opens, so the
 * push that follows slides over a page that is already drawn and has nothing left to mount.
 */
export function registerDestination(
  setScreens: SetScreens,
  page: SheetDestination,
): void {
  setScreens((current) => placedScreen(current, page));
}

// A field supplies its choices when opened; static Sheet.Link callers push a declared name.
export function pushDestination(
  setScreens: SetScreens,
  setPath: SetPath,
  page: string | SheetDestination,
): void {
  if (typeof page !== 'string')
    setScreens((current) => placedScreen(current, page));

  const name = typeof page === 'string' ? page : page.name;

  setPath((current) => pushScreen(current, name));
}

// Back, swipe-back and dismissal complete each visited field once.
export function useScreenExits(
  open: boolean,
  path: string[],
  pages: SheetScreenEntry[],
): void {
  const previous = useRef<SheetScreenEntry[]>([]);

  useLayoutEffect(() => {
    const active = open ? pages.filter((page) => path.includes(page.name)) : [];
    reportExits(previous.current, active);
    previous.current = active;
  }, [open, path, pages]);
  useLayoutEffect(() => (): void => reportExits(previous.current, []), []);
}

function reportExits(
  previous: SheetScreenEntry[],
  active: SheetScreenEntry[],
): void {
  const names = new Set(active.map((page) => page.name));

  for (const page of previous.filter((entry) => !names.has(entry.name)))
    page.onExit?.();
}
