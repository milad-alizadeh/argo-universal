import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, waitFor } from 'storybook/test';
import { gesture } from '../../../../mocks/feed/gutter-wheel.test.mocks';
import { scrolledToEnd } from '../../../features/feed/components/feed/feed-reader.mocks';
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
    beforeEach: (): Promise<void> => settleLayout(1768),
    play: async ({ canvas }) => {
      const scroll = await canvas.findByTestId('feed-scroll');
      await waitFor(() =>
        expect(canvas.getByTestId('desktop-workbench')).toBeVisible(),
      );
      // A real wheel over the outer gutter must reach the pane's scroll viewport.
      await waitFor(async () => await expect(scrolledToEnd(scroll)).toBe(true));
      await gesture(scroll, edge);
    },
  };
}

export const LeftFeedGutterStaysScrollable = gutterWheel('left');

export const RightFeedGutterStaysScrollable = gutterWheel('right');
