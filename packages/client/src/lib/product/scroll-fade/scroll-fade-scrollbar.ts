import { type RefObject, useLayoutEffect, useRef } from 'react';

const scrollingOverflows = new Set(['auto', 'scroll']);

const htmlChildren = (parent: Element): HTMLElement[] =>
  [...parent.children].filter((child) => child instanceof HTMLElement);

const scrolls = (element: HTMLElement): boolean =>
  scrollingOverflows.has(getComputedStyle(element).overflowY);

// The first scroll element inside the frame, nearest first: the scroll view the frame wraps.
function findScroller(root: HTMLElement): HTMLElement | undefined {
  const queue = htmlChildren(root);
  for (let element = queue.shift(); element; element = queue.shift()) {
    if (scrolls(element)) return element;
    queue.push(...htmlChildren(element));
  }
  return undefined;
}

function measureScrollbar(root: HTMLElement, scroller: HTMLElement): void {
  const width = scroller.offsetWidth - scroller.clientWidth;
  if (width > 0) root.style.setProperty('--scroll-fade-bar', `${width}px`);
  else root.style.removeProperty('--scroll-fade-bar');
}

function followScrollbar(root: HTMLElement): (() => void) | undefined {
  const scroller = findScroller(root);
  if (!scroller) return undefined;
  const measure = (): void => measureScrollbar(root, scroller);
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(scroller);
  return (): void => observer.disconnect();
}

// Leaves the scroll view's scrollbar out of the mask: a classic scrollbar's own width, measured as it comes and goes; an overlay scrollbar takes none, so the default strip in react-native-web.css keeps it.
export function useScrollbarStrip(): RefObject<HTMLDivElement | null> {
  const frame = useRef<HTMLDivElement>(null);
  useLayoutEffect(
    () => (frame.current ? followScrollbar(frame.current) : undefined),
    [],
  );
  return frame;
}
