import type { LegendListRef } from '@legendapp/list/react-native';
import { useEffect, type RefObject } from 'react';

// Frames the rows get to measure again; a list that has since become shorter than the position gets its own height back.
const framesToMeasure = 30;

// The rows' own height now reaches the scroll position, so the content can have its own height back without moving it.
function rowsReachPosition(scroller: Element, content: Element): boolean {
  const rows = Array.from(content.children).reduce(
    (total, child) => total + child.getBoundingClientRect().height,
    0,
  );

  return rows >= scroller.scrollTop + scroller.clientHeight;
}

function onceRowsMeasured(
  scroller: Element,
  content: Element,
  done: () => void,
): () => void {
  let frame = 0;
  let id = 0;

  const check = (): void => {
    frame += 1;

    if (frame >= framesToMeasure || rowsReachPosition(scroller, content))
      done();
    else id = requestAnimationFrame(check);
  };

  id = requestAnimationFrame(check);

  return () => cancelAnimationFrame(id);
}

/*
 * Follows the position and height the list has while shown. While hidden it holds the height; a resize observer runs
 * before paint, so the frame the page shows in already has the position back. It lets go once the rows have measured.
 */
function keepScrollWhileHidden(
  scroller: Element,
  content: HTMLElement,
): () => void {
  const { minHeight } = content.style;
  let height = scroller.scrollHeight;
  let position = scroller.scrollTop;
  let holding = false;
  let stopWaiting = (): void => {};

  const remember = (): void => {
    if (!holding && scroller.clientHeight > 0) position = scroller.scrollTop;
  };

  const observer = new ResizeObserver(() => {
    stopWaiting();

    if (scroller.clientHeight === 0) {
      holding = true;
      content.style.minHeight = `${height}px`;
    } else if (holding) {
      scroller.scrollTop = position;
      stopWaiting = onceRowsMeasured(scroller, content, () => {
        holding = false;
        content.style.minHeight = minHeight;
      });
    } else {
      height = scroller.scrollHeight;
    }
  });

  observer.observe(scroller);
  observer.observe(content);
  scroller.addEventListener('scroll', remember, { passive: true });

  return () => {
    scroller.removeEventListener('scroll', remember);
    observer.disconnect();
    stopWaiting();
  };
}

/*
 * The stack hides the page below a pushed one with display: none and keeps it mounted. Rows that draw while hidden
 * measure at zero, so Legend List gives its content no height and the scroll position goes back to the top. The
 * content keeps the height it had until the rows have measured themselves again, and the position comes back with it.
 */
export function useKeepScrollWhileHidden(
  list: RefObject<LegendListRef | null>,
): void {
  useEffect(() => {
    const scroller: unknown = list.current?.getScrollableNode();

    if (!(scroller instanceof HTMLElement)) return undefined;

    const content = scroller.firstElementChild;

    return content instanceof HTMLElement
      ? keepScrollWhileHidden(scroller, content)
      : undefined;
  }, [list]);
}
