import type { LegendListRef } from '@legendapp/list/react-native';
import { useEffect, type RefObject } from 'react';

// Frames the rows get to measure again; a list that has since become shorter than the position gets its own height back.
const framesToMeasure = 30;

const nothing = (): void => {};

// The rows' own height now reaches the scroll position, so the content can have its own height back without moving it.
function rowsReachPosition(scroller: Element, content: Element): boolean {
  const rows = [...content.children].reduce(
    (total, child) => total + child.getBoundingClientRect().height,
    0,
  );

  return rows >= scroller.scrollTop + scroller.clientHeight;
}

function untilMeasured(measured: () => boolean, done: () => void): () => void {
  let frame = 0;
  let id = 0;

  const check = (): void => {
    frame += 1;

    if (frame >= framesToMeasure || measured()) done();
    else id = requestAnimationFrame(check);
  };

  id = requestAnimationFrame(check);

  return () => cancelAnimationFrame(id);
}

/*
 * Follows the position and height the list has while shown. While hidden it holds the height; a resize observer runs
 * before paint, so the frame the page shows in already has the position back. It lets go once the rows have measured.
 */
class HiddenScrollKeeper {
  private readonly ownMinHeight: string;
  private height: number;
  private position: number;
  private holding = false;
  private stopWaiting = nothing;

  constructor(
    private readonly scroller: HTMLElement,
    private readonly content: HTMLElement,
  ) {
    this.ownMinHeight = content.style.minHeight;
    this.height = scroller.scrollHeight;
    this.position = scroller.scrollTop;
  }

  public readonly remember = (): void => {
    if (!this.holding && this.scroller.clientHeight > 0)
      this.position = this.scroller.scrollTop;
  };

  public readonly resized = (): void => {
    this.stopWaiting();

    if (this.scroller.clientHeight === 0) this.hold();
    else if (this.holding) this.reveal();
    else this.height = this.scroller.scrollHeight;
  };

  public stop(): void {
    this.stopWaiting();
  }

  private hold(): void {
    this.holding = true;
    this.content.style.minHeight = `${this.height}px`;
  }

  private reveal(): void {
    this.scroller.scrollTop = this.position;
    this.stopWaiting = untilMeasured(
      () => rowsReachPosition(this.scroller, this.content),
      () => this.letGo(),
    );
  }

  private letGo(): void {
    this.holding = false;
    this.content.style.minHeight = this.ownMinHeight;
  }
}

function keepScrollWhileHidden(scroller: HTMLElement): () => void {
  const content = scroller.firstElementChild;

  if (!(content instanceof HTMLElement)) return nothing;

  const keeper = new HiddenScrollKeeper(scroller, content);
  const observer = new ResizeObserver(keeper.resized);

  observer.observe(scroller);
  observer.observe(content);
  scroller.addEventListener('scroll', keeper.remember, { passive: true });

  return () => {
    scroller.removeEventListener('scroll', keeper.remember);
    observer.disconnect();
    keeper.stop();
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

    return scroller instanceof HTMLElement
      ? keepScrollWhileHidden(scroller)
      : nothing;
  }, [list]);
}
