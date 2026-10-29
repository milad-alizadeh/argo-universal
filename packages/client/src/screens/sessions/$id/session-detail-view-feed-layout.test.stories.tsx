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
  title: 'Tests/Screens/Sessions/Session/FeedLayout',
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => (
    <FramedSessionPreview state="open" {...longSession} />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function fullViewport(width: number): Story {
  return {
    play: async ({ canvas }) => {
      await settleLayout(width);
      const pane = await canvas.findByTestId('session-layout');
      const scroll = await canvas.findByTestId('feed-scroll');
      const composer = await canvas.findByTestId('composer-column');
      await canvas.findAllByTestId('feed-column');
      await waitFor(async () => {
        const view = scroll.getBoundingClientRect();
        const boundary = pane.getBoundingClientRect();
        await expect(Math.abs(view.right - boundary.right)).toBeLessThan(2);
        await expect(Math.abs(view.left - boundary.left)).toBeLessThan(2);
        await expect(scroll.scrollWidth).toBeLessThanOrEqual(
          scroll.clientWidth + 1,
        );

        for (const row of canvas.getAllByTestId('feed-column')) {
          const content = row.getBoundingClientRect();
          await expect(content.width).toBeLessThanOrEqual(800);
          await expect(
            Math.abs(content.left + content.right - view.left - view.right),
          ).toBeLessThan(2);
          const input = composer.getBoundingClientRect();
          await expect(Math.abs(content.left - input.left)).toBeLessThan(2);
        }
      });
      // A real wheel over the outer gutter must reach the pane's scroll viewport.
      await waitFor(async () => await expect(scrolledToEnd(scroll)).toBe(true));
      await markSettledMiddleOfView(scroll);
      const view = scroll.getBoundingClientRect();

      for (const x of [view.left + 12, view.right - 12])
        await wheelInGutter(scroll, x);
    },
  };
}

// A short wheel gesture stops tail-follow, then reads older content from either outer gutter.
async function wheelInGutter(scroll: HTMLElement, x: number): Promise<void> {
  const view = scroll.getBoundingClientRect();
  const before = scroll.scrollTop;
  const marked = markMiddleOfView(scroll);
  const point = { x, y: view.top + view.height / 2 };
  await browserUser.hover(scroll, {
    position: { x: x - view.left, y: view.height / 2 },
  });

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

export const PhoneViewport = fullViewport(390);

export const WideViewport = fullViewport(1920);
