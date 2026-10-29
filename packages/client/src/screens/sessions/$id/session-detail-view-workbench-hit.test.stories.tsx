import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, waitFor } from 'storybook/test';
import { cdp, userEvent as browserUser } from 'vitest/browser';
import {
  markMiddleOfView,
  markSettledMiddleOfView,
  scrolledToEnd,
} from '../../../features/feed/components/feed/feed-reader.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { longSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/WorkbenchHit',
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => (
    <FramedSessionPreview state="open" {...longSession} />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function gutterWheel(edge: 'left' | 'right'): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout(1920),
    play: async ({ canvas }) => {
      const scroll = await canvas.findByTestId('feed-scroll');
      await waitFor(() =>
        expect(canvas.getByTestId('desktop-workbench')).toBeVisible(),
      );
      // A real wheel over the outer gutter must reach the pane's scroll viewport.
      await waitFor(async () => await expect(scrolledToEnd(scroll)).toBe(true));
      await markSettledMiddleOfView(scroll);
      await wheelInGutter(scroll, edge);
    },
  };
}

export const LeftFeedGutterStaysScrollable = gutterWheel('left');

export const RightFeedGutterStaysScrollable = gutterWheel('right');

const gutterOffset = (edge: 'left' | 'right', width: number): number =>
  edge === 'left' ? 12 : width - 12;

// A short wheel gesture stops tail-follow, then reads older content from either outer gutter.
async function wheelInGutter(
  scroll: HTMLElement,
  edge: 'left' | 'right',
): Promise<void> {
  await browserUser.hover(scroll, {
    position: {
      x: gutterOffset(edge, scroll.clientWidth),
      y: scroll.clientHeight / 2,
    },
  });

  const view = scroll.getBoundingClientRect();
  const x = view.left + gutterOffset(edge, view.width);
  const before = scroll.scrollTop;
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
    await expect(scroll.scrollTop).toBeLessThan(before - 2);
    const current = markMiddleOfView(scroll);
    // Virtualization can unmount the earlier mark after the wheel reveals older rows.
    await expect(
      current.element !== marked.element ||
        Math.abs(current.top - marked.top) > 2,
    ).toBe(true);
  });
}
