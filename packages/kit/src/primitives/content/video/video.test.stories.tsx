import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, waitFor } from 'storybook/test';
import { MediaUrlContext, useMediaUrl } from '#primitives/content/media-url';
import { Video } from './video';

const meta = {
  title: 'Tests/Design System/Primitives/Content/Video',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const hash = 'a'.repeat(64);

const clip = { pluginId: 'example', hash, format: 'mp4' } as const;

// Refuses the clip until a test mends it, so a retry proves it loads again.
let mended = false;

function Flaky(props: { children: React.ReactNode }): React.JSX.Element {
  const real = useMediaUrl();

  return (
    <MediaUrlContext.Provider
      value={(asset) => (mended ? real(asset) : 'data:video/mp4;base64,AAAA')}
    >
      {props.children}
    </MediaUrlContext.Provider>
  );
}

const loadTimeout = { timeout: 5000 };

const video = { selector: 'video' };

const retryDemo = { name: 'Retry Demo clip' };

export const LoadsWithStockControls: Story = {
  render: () => (
    <Video
      source={clip}
      poster={{ pluginId: 'example', hash, format: 'jpeg' }}
      accessibilityLabel="Demo clip"
    />
  ),
  play: async ({ canvas }) => {
    const player = canvas.getByLabelText('Demo clip', video);

    await expect(player).toHaveAttribute('controls');
    await expect(player).not.toHaveAttribute('autoplay');
    await waitFor(
      () =>
        expect(
          canvas.queryByRole('progressbar', { name: 'Loading video' }),
        ).not.toBeInTheDocument(),
      loadTimeout,
    );
  },
};

export const AutoPlayIsMutedAndLoopingUntilPressed: Story = {
  render: () => <Video source={clip} autoPlay accessibilityLabel="Loop" />,
  play: async ({ canvas, userEvent }) => {
    const player = canvas.getByLabelText<HTMLVideoElement>('Loop', video);

    await expect(player.muted).toBe(true);
    await expect(player.loop).toBe(true);
    await expect(player).not.toHaveAttribute('controls');
    await userEvent.click(canvas.getByRole('button', { name: 'Loop' }));
    await expect(player).toHaveAttribute('controls');
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
  },
};

export const ErrorFrameRetries: Story = {
  beforeEach: () => {
    mended = false;
  },
  render: () => (
    <Flaky>
      <Video source={clip} accessibilityLabel="Demo clip" />
    </Flaky>
  ),
  play: async ({ canvas, userEvent }) => {
    const retry = await canvas.findByRole('button', retryDemo, loadTimeout);

    mended = true;
    await userEvent.click(retry);
    await waitFor(
      () => expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument(),
      loadTimeout,
    );
    await expect(canvas.getByLabelText('Demo clip', video)).toBeVisible();
    await expect(
      canvas.queryByRole('button', retryDemo),
    ).not.toBeInTheDocument();
  },
};
