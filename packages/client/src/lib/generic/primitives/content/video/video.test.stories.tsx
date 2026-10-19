import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { type MediaUrl, MediaUrlContext } from '#primitives/content/media-url';
import { Video } from './video';

const meta = { title: 'Tests/Video' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const hash = 'a'.repeat(64);

const clip = { pluginId: 'hello', hash, format: 'mp4' } as const;

const missing: MediaUrl = () => 'http://127.0.0.1:9/missing.mp4';

const loadTimeout = { timeout: 5000 };

const video = { selector: 'video' };

const retryDemo = { name: 'Retry Demo clip' };

export const LoadsWithStockControls: Story = {
  render: () => (
    <Video
      source={clip}
      poster={{ pluginId: 'hello', hash, format: 'jpeg' }}
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
  render: () => (
    <MediaUrlContext.Provider value={missing}>
      <Video source={clip} accessibilityLabel="Demo clip" />
    </MediaUrlContext.Provider>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', retryDemo, loadTimeout),
    );
    await expect(
      await canvas.findByRole('button', retryDemo, loadTimeout),
    ).toBeVisible();
  },
};
