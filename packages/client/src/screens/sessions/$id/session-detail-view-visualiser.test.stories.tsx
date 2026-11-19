import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, waitFor } from 'storybook/test';
import { feedScrollId } from '../../../features/feed/components/feed/feed-reader.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  bandCallSession,
  orbCallSession,
} from './session-detail-view-visualiser.mocks';
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

// With the band chosen the call draws along the Composer, with no stage and no toggle above the Feed.
export const BandAlongTheComposer: Story = {
  render: (): React.JSX.Element => (
    <FramedSessionPreview state="open" {...bandCallSession} />
  ),
  play: async ({ canvas }) => {
    await settleLayout(1440);
    await expect(await canvas.findByTestId('voice-edge-band')).toBeVisible();
    await expect(canvas.queryByTestId('voice-stage')).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('group', { name: 'Visualiser' }),
    ).not.toBeInTheDocument();
  },
};

// With the orb, the stage holds the orb alone and no toggle, and the Composer draws no band.
export const OrbAboveTheFeed: Story = {
  render: (): React.JSX.Element => (
    <FramedSessionPreview state="open" {...orbCallSession} />
  ),
  play: async ({ canvas }) => {
    await settleLayout(1440);
    await expect(await canvas.findByTestId('voice-visualiser')).toBeVisible();
    await expect(
      canvas.queryByRole('group', { name: 'Visualiser' }),
    ).not.toBeInTheDocument();
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

// With the Inspector open beside it, the orb stays centred over the Feed's column, not the window.
export const CentredBesideTheInspector: Story = {
  render: (): React.JSX.Element => (
    <FramedSessionPreview
      state="open"
      {...orbCallSession}
      feed={longSession.feed}
    />
  ),
  play: async ({ canvas }) => {
    await settleLayout(desktopWithInspector);
    await expect(await canvas.findByTestId('desktop-inspector')).toBeVisible();
    await expectOverTheFeed(canvas);
  },
};
