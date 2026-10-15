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

// A choice page follows its owner's current props, including availability and loading changes.
export function updateDestination(
  setPages: SetPages,
  page: SheetDestination,
): void {
  setPages((current) =>
    current.some((entry) => entry.name === page.name)
      ? current.map((entry) =>
          entry.name === page.name
            ? { ...page, content: page.children }
            : entry,
        )
      : current,
  );
}

// A field supplies its choices when opened; static Sheet.Link callers push a declared name.
export function pushDestination(
  setPages: SetPages,
  setPath: SetPath,
  page: string | SheetDestination,
): void {
  if (typeof page !== 'string')
    setPages((current) => [
      ...current.filter((entry) => entry.name !== page.name),
      { ...page, content: page.children },
    ]);

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
