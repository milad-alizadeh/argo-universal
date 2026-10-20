import type { HorizontalPagerHandle } from '@expo/ui/jetpack-compose';
import {
  useEffect,
  useState,
  useRef,
  type Dispatch,
  type SetStateAction,
  type RefObject,
} from 'react';
import type { SheetPageEntry, SheetStack } from './sheet-pages';

// Keep popped pages until the pager settles; a new page must be laid out before scrolling to it.
export interface SheetPager {
  ready: boolean;
  pages: SheetPageEntry[];
  pageReady: (index: number) => void;
  settled: (index: number) => void;
}

export function useSheetPager(stack: SheetStack, open: boolean): SheetPager {
  const [path, retain] = useRetainedPath(stack.path, open);
  const native = usePageReadiness(stack.path);
  const target = stack.path.length;

  return {
    pages: pagerPages(stack.pages, path),
    ...native,
    settled: (index: number): void => {
      if (index === target) retain(stack.path);
    },
  };
}

/*
 * A popped page stays in the pager until it has slid away, so the retained path can be longer than
 * the sheet's own. Each opening drops it: a sheet closed on a pushed page reopens on its root, as
 * a stock sheet does, rather than coming back where it was left with nothing to go back to.
 */
function useRetainedPath(
  path: string[],
  open: boolean,
): readonly [string[], Dispatch<SetStateAction<string[]>>] {
  const [retained, retain] = useState(path);
  const next = retainedPath(retained, path, useOpening(open));

  if (next !== retained) retain(next);

  return [next, retain] as const;
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
 * The pages the pager draws: the root, then the pushed pages in order. A page is drawn once, however
 * often its name appears, because the pager keys its pages by name and React drops a repeated key.
 */
function pagerPages(pages: SheetPageEntry[], path: string[]): SheetPageEntry[] {
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

type Readiness = { path: string[]; ready: boolean };

type PageReadiness = Pick<SheetPager, 'ready' | 'pageReady'>;

function usePageReadiness(path: string[]): PageReadiness {
  const [state, setState] = useState<Readiness>(() => pageReadiness(path));

  if (state.path !== path) setState(pageReadiness(path));

  return {
    ready: state.ready,
    pageReady: (index: number): void => {
      if (index === path.length)
        setState((current) => markReady(current, path));
    },
  };
}

function pageReadiness(path: string[]): Readiness {
  return { path, ready: path.length === 0 };
}

function markReady(state: Readiness, path: string[]): Readiness {
  return state.path === path && !state.ready ? { path, ready: true } : state;
}

export function usePageScroll(
  ref: RefObject<HorizontalPagerHandle | null>,
  target: number,
  ready: boolean,
): void {
  const current = useRef(0);

  useEffect(() => {
    if (!ready || current.current === target) return;

    current.current = target;
    scrollToPage(ref, target);
  }, [ref, target, ready]);
}

// The pager starts on zero; imperative scrolling is only needed after navigation changes its target.
function scrollToPage(
  ref: RefObject<HorizontalPagerHandle | null>,
  target: number,
): void {
  void ref.current?.animateScrollToPage(target);
}
