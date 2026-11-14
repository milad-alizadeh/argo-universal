import type { LegendListRef } from '@legendapp/list/react-native';
import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';

// Legend List draws each sticky header in a cell with an inline z-index of this and up; no other row has one.
const stickyZIndex = 1000;

const stickyCells = (node: Element): HTMLElement[] =>
  [...node.querySelectorAll<HTMLElement>('[style*="z-index"]')].filter(
    (cell) => Number(cell.style.zIndex) >= stickyZIndex,
  );

// How far up a cell is already pushed.
const pushOf = (cell: HTMLElement): number =>
  Number(cell.dataset.stickyPush ?? 0);

function setPush(cell: HTMLElement, push: number): void {
  if (pushOf(cell) === push) return;

  cell.dataset.stickyPush = String(push);
  cell.style.transform = push ? `translateY(${push}px)` : '';
}

// The top of the first header below the stuck one, where the stuck one has to end.
function nextTop(stuck: HTMLElement, cells: HTMLElement[]): number {
  const top = stuck.getBoundingClientRect().top - pushOf(stuck);

  return Math.min(
    ...cells.flatMap((cell) => {
      const cellTop = cell.getBoundingClientRect().top;

      return cellTop > top ? [cellTop] : [];
    }),
  );
}

/*
 * Legend List's web build sticks the active header with CSS `position: sticky` and nothing more, so the next header
 * slides over it (#2051). The stuck header is pushed up by however far the next one reaches into it, as on iOS and
 * Android, where its Reanimated build does the same.
 */
function pushStuckHeader(node: Element): void {
  const cells = stickyCells(node);
  const stuck = cells.find((cell) => cell.style.position === 'sticky');
  const others = cells.filter((cell) => cell !== stuck);

  for (const cell of others) setPush(cell, 0);

  if (!stuck) return;

  const room = nextTop(stuck, others) - stuck.getBoundingClientRect().top;

  setPush(stuck, Math.min(0, pushOf(stuck) + room - stuck.offsetHeight));
}

// Watches one list node: each scroll, and each style Legend List writes as it swaps the stuck header or moves rows.
function watchNode(node: Element): () => void {
  const push = (): void => pushStuckHeader(node);
  const observer = new MutationObserver(push);

  observer.observe(node, {
    subtree: true,
    attributes: true,
    attributeFilter: ['style'],
  });
  node.addEventListener('scroll', push, { passive: true });
  push();

  return (): void => {
    observer.disconnect();
    node.removeEventListener('scroll', push);
  };
}

function scrollNode(list: LegendListRef | null): Element | undefined {
  const node: unknown = list?.getScrollableNode();

  return node instanceof Element ? node : undefined;
}

const stickyNode = (
  list: LegendListRef | null,
  sticky: boolean,
): Element | undefined => (sticky ? scrollNode(list) : undefined);

interface Watched {
  node?: Element;
  stop?: () => void;
}

function rewatch(watched: Watched, node: Element | undefined): Watched {
  watched.stop?.();

  return { node, stop: node && watchNode(node) };
}

// The list's node can arrive after the first draw, so each draw checks it is the one watched.
export function usePushedStickyHeaders(
  list: RefObject<LegendListRef | null>,
  sticky: boolean,
): void {
  const watched = useRef<Watched>({});

  useLayoutEffect(() => {
    const node = stickyNode(list.current, sticky);

    if (watched.current.node !== node)
      watched.current = rewatch(watched.current, node);
  });

  useEffect(() => (): void => watched.current.stop?.(), []);
}
