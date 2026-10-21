import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { type MediaUrl, MediaUrlContext } from '#primitives/content/media-url';
import { Audio } from './audio';
import { pausedAudio } from './audio-fixtures';
import { AudioTransport } from './audio-transport';
import {
  loadingAudioTransport,
  playingAudioTransport,
} from './audio-transport-fixtures';

// A source the browser refuses at once, with no network.
const missing: MediaUrl = () => 'data:audio/mpeg;base64,AAAA';

const ignore = (): void => undefined;

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
      {...playingAudioTransport}
      onToggle={ignore}
      onSeek={ignore}
    />
  ),
};

export const Loading: Story = {
  render: () => (
    <AudioTransport
      {...loadingAudioTransport}
      onToggle={ignore}
      onSeek={ignore}
    />
  ),
};

export const Failed: Story = {
  args: pausedAudio,
  render: (args) => (
    <MediaUrlContext.Provider value={missing}>
      <Audio {...args} />
    </MediaUrlContext.Provider>
  ),
};
