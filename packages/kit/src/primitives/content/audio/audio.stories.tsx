import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { type MediaUrl, MediaUrlContext } from '#primitives/content/media-url';
import { Audio } from './audio';
import { failedAudio, pausedAudio } from './audio-fixtures';
import { AudioTransport, type AudioTransportProps } from './audio-transport';

// A source the browser refuses at once, with no network.
const missing: MediaUrl = () => 'data:audio/mpeg;base64,AAAA';

const ignore = (): void => undefined;

const transport = {
  label: 'Chime',
  onToggle: ignore,
  onSeek: ignore,
} satisfies Partial<AudioTransportProps>;

const meta = {
  title: 'Design System/Primitives/Content/Audio',
  component: Audio,
  args: pausedAudio,
  argTypes: kitArgTypes('Audio'),
} satisfies Meta<typeof Audio>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Paused: Story = { args: pausedAudio };

/*
 * Playing and Loading draw the transport row directly: the phase is the player's
 * own state, which no Audio prop sets.
 */
export const Playing: Story = {
  render: () => (
    <AudioTransport
      {...transport}
      phase="playing"
      currentTime={47}
      duration={192}
    />
  ),
};

export const Loading: Story = {
  render: () => (
    <AudioTransport
      {...transport}
      phase="loading"
      currentTime={0}
      duration={0}
    />
  ),
};

export const Failed: Story = {
  args: failedAudio,
  render: (args) => (
    <MediaUrlContext.Provider value={missing}>
      <Audio {...args} />
    </MediaUrlContext.Provider>
  ),
};
