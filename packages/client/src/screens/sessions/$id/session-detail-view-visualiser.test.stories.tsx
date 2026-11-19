import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, waitFor } from 'storybook/test';
import { feedScrollId } from '../../../features/feed/components/feed/feed-reader.mocks';
import { VisualiserChoosingPreview } from './session-detail-view-visualiser.mocks';
import { longSession } from './session-detail-view.mocks';

// Wide enough that the Inspector docks beside the Feed, as the Panels tests set it.
const desktopWithInspector = 2224;

const meta = {
  title: 'Tests/Screens/Sessions/Session/Visualiser',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const middleOf = (element: HTMLElement): number => {
  const box = element.getBoundingClientRect();

  return box.x + box.width / 2;
};

// Choosing Band empties the stage but for the toggle and draws the call along the Composer; choosing back restores it.
export const BandAlongTheComposer: Story = {
  render: (): React.JSX.Element => <VisualiserChoosingPreview first="orb" />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout(1440);
    await userEvent.click(await canvas.findByRole('button', { name: 'Band' }));
    await expect(await canvas.findByTestId('voice-edge-band')).toBeVisible();
    await expect(
      canvas.queryByTestId('voice-visualiser'),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Matrix' }));
    await expect(
      await canvas.findByTestId('voice-visualiser-matrix'),
    ).toBeVisible();
    await expect(
      canvas.queryByTestId('voice-edge-band'),
    ).not.toBeInTheDocument();
  },
};

async function expectOverTheFeed(canvas: Canvas): Promise<void> {
  const feed = await canvas.findByTestId(feedScrollId);

  await waitFor(() =>
    expect(middleOf(canvas.getByTestId('voice-visualiser'))).toBeCloseTo(
      middleOf(feed),
      0,
    ),
  );
}

// With the Inspector open beside it, the drawing stays centred over the Feed's column, not the window.
export const CentredBesideTheInspector: Story = {
  render: (): React.JSX.Element => (
    <VisualiserChoosingPreview first="wave" feed={longSession.feed} />
  ),
  play: async ({ canvas }) => {
    await settleLayout(desktopWithInspector);
    await expect(await canvas.findByTestId('desktop-inspector')).toBeVisible();
    await expectOverTheFeed(canvas);
  },
};
