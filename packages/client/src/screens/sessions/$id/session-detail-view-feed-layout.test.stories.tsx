import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, waitFor } from 'storybook/test';
import { gesture } from '../../../../mocks/feed/gutter-wheel.test.mocks';
import { scrolledToEnd } from '../../../features/feed/components/feed/feed-reader.mocks';
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

function fullViewport(width: number, side: 'left' | 'right'): Story {
  return {
    play: async ({ canvas }) => {
      await settleLayout(width);
      const pane = await canvas.findByTestId('session-layout');
      const scroll = await canvas.findByTestId('feed-scroll');
      await canvas.findAllByTestId('feed-column');
      await waitFor(async () => {
        const view = scroll.getBoundingClientRect();
        const boundary = pane.getBoundingClientRect();
        await expect(Math.abs(view.right - boundary.right)).toBeLessThan(2);
        await expect(Math.abs(view.left - boundary.left)).toBeLessThan(2);
        await expect(scroll.scrollWidth).toBeLessThanOrEqual(
          scroll.clientWidth + 1,
        );
      });
      // A real wheel over the outer gutter must reach the pane's scroll viewport.
      await waitFor(async () => await expect(scrolledToEnd(scroll)).toBe(true));
      await gesture(scroll, side);
    },
  };
}

export const PhoneLeftGutter = fullViewport(390, 'left');

export const PhoneRightGutter = fullViewport(390, 'right');

// Wide enough that the Workbench's cards keep the column centred in the page, as Codex's thread is from each side keeping 400.
const desktop = 2560;

export const DesktopLeftGutter = fullViewport(desktop, 'left');

export const DesktopRightGutter = fullViewport(desktop, 'right');
