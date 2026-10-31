import { expect, waitFor } from 'storybook/test';
import { cdp, userEvent as browserUser } from 'vitest/browser';
import {
  markMiddleOfView,
  markSettledMiddleOfView,
} from '../../src/features/feed/components/feed/feed-reader.mocks';

// How far the view sits above the Feed's end. Older rows landing above the view lift every scrollTop by their height, so only this stays true to where the reader is.
const distanceFromEnd = (scroll: HTMLElement): number =>
  scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight;

const gutterOffset = (edge: 'left' | 'right', width: number): number =>
  edge === 'left' ? 12 : width - 12;

// A short wheel gesture stops tail-follow, then reads older content from either outer gutter.
export async function gesture(
  scroll: HTMLElement,
  edge: 'left' | 'right',
): Promise<void> {
  await markSettledMiddleOfView(scroll);
  await browserUser.hover(scroll, {
    position: {
      x: gutterOffset(edge, scroll.clientWidth),
      y: scroll.clientHeight / 2,
    },
  });

  const view = scroll.getBoundingClientRect();
  const x = view.left + gutterOffset(edge, view.width);
  const before = distanceFromEnd(scroll);
  const marked = markMiddleOfView(scroll);
  const point = { x, y: view.top + view.height / 2 };
  const hit = document.elementFromPoint(point.x, point.y);
  await expect(
    scroll.contains(hit),
    JSON.stringify({ point, feed: view, hit: hit?.outerHTML.slice(0, 700) }),
  ).toBe(true);

  for (let tick = 0; tick < 3; tick++) {
    await cdp().send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      modifiers: 0,
      ...point,
      deltaX: 0,
      deltaY: -250,
    });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  }

  await waitFor(async () => {
    // Measured from the end: older rows landing above the view lift scrollTop past where it began.
    await expect(distanceFromEnd(scroll)).toBeGreaterThan(before + 2);
    const current = markMiddleOfView(scroll);
    // Virtualization can unmount the earlier mark after the wheel reveals older rows.
    await expect(
      current.element !== marked.element ||
        Math.abs(current.top - marked.top) > 2,
    ).toBe(true);
  });
}
