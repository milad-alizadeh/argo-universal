import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fireEvent, fn, waitFor } from 'storybook/test';
import { type MediaUrl, MediaUrlContext } from '#primitives/content/media-url';
import { Audio } from './audio';
import { AudioTransport } from './audio-transport';

const meta = { title: 'Tests/Audio' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const chime = {
  pluginId: 'hello',
  hash: 'a'.repeat(64),
  format: 'mp3',
} as const;

const missing: MediaUrl = () => 'http://127.0.0.1:9/missing.mp3';

const loadTimeout = { timeout: 5000 };

const playChime = { name: 'Play Chime' };

const unplayable = 'Can’t play this audio';

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

// Pausing before the browser has started playing rejects play() inside expo-audio, so a test lets a clip play a second first.
async function playedASecond(canvas: Canvas, name: string): Promise<void> {
  const slider = canvas.getByRole('slider', { name });

  await waitFor(
    () => expect(slider).toHaveAttribute('aria-valuetext', '0:01 of 0:06'),
    loadTimeout,
  );
}

export const PlaysAndPauses: Story = {
  render: () => <Audio source={chime} accessibilityLabel="Chime" />,
  play: async ({ canvas, userEvent }) => {
    const play = canvas.getByRole('button', playChime);

    await waitFor(() => expect(play).toBeEnabled(), loadTimeout);
    await userEvent.click(play);
    await playedASecond(canvas, 'Chime');
    await userEvent.click(canvas.getByRole('button', { name: 'Pause Chime' }));
    await expect(await canvas.findByRole('button', playChime)).toBeVisible();
  },
};

export const ScrubberSeeks: Story = {
  render: () => <Audio source={chime} accessibilityLabel="Chime" />,
  play: async ({ canvas }) => {
    await canvas.findByText('0:00 / 0:06', undefined, loadTimeout);
    await fireEvent.change(canvas.getByRole('slider', { name: 'Chime' }), {
      target: { value: '3' },
    });
    await expect(
      await canvas.findByText('0:03 / 0:06', undefined, loadTimeout),
    ).toBeVisible();
    await expect(canvas.getByRole('slider', { name: 'Chime' })).toHaveAttribute(
      'aria-valuetext',
      '0:03 of 0:06',
    );
  },
};

export const OneClipPlaysAtATime: Story = {
  render: () => (
    <>
      <Audio source={chime} accessibilityLabel="First" />
      <Audio source={chime} accessibilityLabel="Second" />
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    const second = canvas.getByRole('button', { name: 'Play Second' });

    await waitFor(() => expect(second).toBeEnabled(), loadTimeout);
    await userEvent.click(canvas.getByRole('button', { name: 'Play First' }));
    await playedASecond(canvas, 'First');
    await userEvent.click(second);
    await expect(
      await canvas.findByRole('button', { name: 'Play First' }),
    ).toBeVisible();
    await playedASecond(canvas, 'Second');
  },
};

const onToggle = fn();

export const LoadingWaits: Story = {
  render: () => (
    <AudioTransport
      label="Chime"
      phase="loading"
      currentTime={0}
      duration={0}
      onToggle={onToggle}
      onSeek={fn()}
    />
  ),
  play: async ({ canvas }) => {
    const play = canvas.getByRole('button', playChime);

    await expect(play).toHaveAttribute('aria-busy', 'true');
    play.click();
    await expect(onToggle).not.toHaveBeenCalled();
    await expect(canvas.getByRole('slider', { name: 'Chime' })).toBeDisabled();
  },
};

export const ErrorKeepsPlayToRetry: Story = {
  render: () => (
    <MediaUrlContext.Provider value={missing}>
      <Audio source={chime} accessibilityLabel="Chime" />
    </MediaUrlContext.Provider>
  ),
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText(unplayable, undefined, loadTimeout);
    await expect(canvas.queryByRole('slider')).not.toBeInTheDocument();
    const retry = canvas.getByRole('button', playChime);

    await expect(retry).toBeEnabled();
    await userEvent.click(retry);
    await expect(
      await canvas.findByText(unplayable, undefined, loadTimeout),
    ).toBeVisible();
  },
};
