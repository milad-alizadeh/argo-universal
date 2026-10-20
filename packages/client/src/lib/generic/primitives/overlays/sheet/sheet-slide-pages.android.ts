import { useState } from 'react';
import type { SheetPageEntry, SheetStack } from './sheet-pages';

/*
 * The pages the row draws: the root, then the pushed pages in order. A popped page stays until the slide
 * back has finished, so the reader watches it leave rather than seeing it vanish under the one below.
 */
export function useRetainedPages(
  stack: SheetStack,
  open: boolean,
): SheetPageEntry[] {
  const path = useRetainedPath(stack.path, open);

  return slidePages(stack.pages, path);
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

// A page is drawn once, however often its name appears, because React drops a repeated key.
function slidePages(pages: SheetPageEntry[], path: string[]): SheetPageEntry[] {
  const root = pages.slice(0, 1);
  const drawn = new Set(root.map((page) => page.name));

  return [...root, ...path.flatMap((name) => pushedPage(pages, name, drawn))];
}

function pushedPage(
  pages: SheetPageEntry[],
  name: string,
  drawn: Set<string>,
): SheetPageEntry[] {
  const page = drawn.has(name)
    ? undefined
    : pages.find((entry) => entry.name === name);

  if (!page) return [];
  drawn.add(name);

  return [page];
}
