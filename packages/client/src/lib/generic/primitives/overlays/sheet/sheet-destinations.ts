import {
  useLayoutEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { SheetPageEntry } from './sheet-pages';
import type { SheetDestination } from './sheet-props';
import { pushPage } from './sheet-state';

type SetPages = Dispatch<SetStateAction<SheetPageEntry[]>>;

type SetPath = Dispatch<SetStateAction<string[]>>;

/*
 * Where a page sits in the sheet is settled the first time the sheet is given it and never moves while the
 * sheet is open: a page the reader has already slid to would slide out from under them if a later page
 * took its place in the row.
 */
function placedPage(
  current: SheetPageEntry[],
  page: SheetDestination,
): SheetPageEntry[] {
  const entry = { ...page, content: page.children };

  return current.some((held) => held.name === page.name)
    ? current.map((held) => (held.name === page.name ? entry : held))
    : [...current, entry];
}

// A choice page follows its owner's current props, including availability and loading changes.
export function updateDestination(
  setPages: SetPages,
  page: SheetDestination,
): void {
  setPages((current) =>
    current.some((entry) => entry.name === page.name)
      ? placedPage(current, page)
      : current,
  );
}

/*
 * A page the sheet carries without showing: it takes its place in the row while the sheet opens, so the
 * push that follows slides over a page that is already drawn and has nothing left to mount.
 */
export function registerDestination(
  setPages: SetPages,
  page: SheetDestination,
): void {
  setPages((current) => placedPage(current, page));
}

// A field supplies its choices when opened; static Sheet.Link callers push a declared name.
export function pushDestination(
  setPages: SetPages,
  setPath: SetPath,
  page: string | SheetDestination,
): void {
  if (typeof page !== 'string')
    setPages((current) => placedPage(current, page));

  const name = typeof page === 'string' ? page : page.name;

  setPath((current) => pushPage(current, name));
}

// Back, swipe-back and dismissal complete each visited field once.
export function usePageExits(
  open: boolean,
  path: string[],
  pages: SheetPageEntry[],
): void {
  const previous = useRef<SheetPageEntry[]>([]);

  useLayoutEffect(() => {
    const active = open ? pages.filter((page) => path.includes(page.name)) : [];
    reportExits(previous.current, active);
    previous.current = active;
  }, [open, path, pages]);
  useLayoutEffect(() => (): void => reportExits(previous.current, []), []);
}

function reportExits(
  previous: SheetPageEntry[],
  active: SheetPageEntry[],
): void {
  const names = new Set(active.map((page) => page.name));

  for (const page of previous.filter((entry) => !names.has(entry.name)))
    page.onExit?.();
}
