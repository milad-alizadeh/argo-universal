import { useState } from 'react';
import type { SheetScreenEntry, SheetStack } from './sheet-screens';

export interface RetainedScreens {
  // The pages the row holds, in the order they take their places in it.
  pages: SheetScreenEntry[];
  // The place the row stops at: where in it the page the reader is on sits.
  slot: number;
}

/*
 * The pages the row draws: the root, then every page the sheet is carrying — those on standby from the
 * moment it opened, and those pushed since. A popped page stays until the slide back has finished, so the
 * reader watches it leave rather than seeing it vanish under the one below.
 */
export function useRetainedScreens(
  stack: SheetStack,
  open: boolean,
): RetainedScreens {
  const path = useRetainedPath(stack.path, open);
  const pages = slideScreens(stack.pages, path);

  return { pages, slot: slotOf(pages, stack.path) };
}

/*
 * Each opening drops the retained path: a sheet closed on a pushed page reopens on its root, as a stock
 * sheet does, rather than coming back where it was left with nothing to go back to.
 */
function useRetainedPath(path: string[], open: boolean): string[] {
  const [retained, retain] = useState(path);
  const next = retainedPath(retained, path, useOpening(open));

  if (next !== retained) retain(next);

  return next;
}

// The sheet keeps its pages while the path it is leaving still starts with the path it is going to.
function retainedPath(
  retained: string[],
  path: string[],
  opening: boolean,
): string[] {
  if (opening) return path;

  return path.every((name, index) => retained[index] === name)
    ? retained
    : path;
}

function useOpening(open: boolean): boolean {
  const [shown, setShown] = useState(open);

  if (open !== shown) setShown(open);

  return open && !shown;
}

/*
 * A page keeps its place for as long as the sheet is open: the pages come in the order the sheet was given
 * them and that order only grows, so a page the reader slid to does not move under them when another
 * arrives. The root leads, because it is the page the sheet opens on.
 */
function slideScreens(
  pages: SheetScreenEntry[],
  path: string[],
): SheetScreenEntry[] {
  const [root, ...rest] = pages;

  if (!root) return [];

  return [root, ...rest.filter((page) => carried(page, path))];
}

const carried = (page: SheetScreenEntry, path: string[]): boolean =>
  page.standby === true || path.includes(page.name);

// Where the row stops: the place of the page the path ends on, the root when nothing is pushed.
function slotOf(pages: SheetScreenEntry[], path: string[]): number {
  const name = path.at(-1);

  if (name === undefined) return 0;

  return Math.max(
    pages.findIndex((page) => page.name === name),
    0,
  );
}
