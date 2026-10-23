import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { type MediaUrl, MediaUrlContext } from '#primitives/content/media-url';
import { Audio } from './audio';
import { pausedAudio } from './audio-fixtures';

// A source the browser refuses at once, with no network.
const missing: MediaUrl = () => 'data:audio/mpeg;base64,AAAA';

const meta = {
  title: 'Design System/Primitives/Content/Audio',
  component: Audio,
  args: pausedAudio,
  argTypes: kitArgTypes('Audio'),
} satisfies Meta<typeof Audio>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Paused: Story = { args: pausedAudio };

export const Failed: Story = {
  args: pausedAudio,
  render: (args) => (
    <MediaUrlContext.Provider value={missing}>
      <Audio {...args} />
    </MediaUrlContext.Provider>
  ),
};
