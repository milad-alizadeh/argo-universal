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

export function useSheetPager(stack: SheetStack): SheetPager {
  const [path, retain] = useRetainedPath(stack.path);
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

function useRetainedPath(
  path: string[],
): readonly [string[], Dispatch<SetStateAction<string[]>>] {
  const [retained, retain] = useState(path);

  const next = path.every((name, index) => retained[index] === name)
    ? retained
    : path;

  if (next !== retained) retain(next);

  return [next, retain] as const;
}

function pagerPages(pages: SheetPageEntry[], path: string[]): SheetPageEntry[] {
  const root = pages.slice(0, 1);

  return [
    ...root,
    ...path.flatMap((name) => pages.filter((page) => page.name === name)),
  ];
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
