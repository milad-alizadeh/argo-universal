import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { type MediaUrl, MediaUrlContext } from '#primitives/content/media-url';
import { Video } from './video';

const hash = 'a'.repeat(64);

const clip = { pluginId: 'hello', hash, format: 'mp4' } as const;

const poster = { pluginId: 'hello', hash, format: 'jpeg' } as const;

// A source the browser refuses at once, with no network.
const missing: MediaUrl = () => 'data:video/mp4;base64,AAAA';

const meta = {
  title: 'Design System/Primitives/Content/Video',
  component: Video,
  args: { source: clip, accessibilityLabel: 'Demo clip' },
  argTypes: kitArgTypes('Video'),
} satisfies Meta<typeof Video>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithPoster: Story = { args: { poster } };

export const Autoplay: Story = {
  args: { aspect: 'square', autoPlay: true, accessibilityLabel: 'Loop' },
  parameters: {
    docs: { description: { story: 'A square frame, playing at once.' } },
  },
};

export const Failed: Story = {
  render: (args) => (
    <MediaUrlContext.Provider value={missing}>
      <Video {...args} />
    </MediaUrlContext.Provider>
  ),
};
