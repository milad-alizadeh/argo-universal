import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { type MediaUrl, MediaUrlContext } from '#primitives/content/media-url';
import { Video } from './video';
import { autoplayVideo, failedVideo, stillFrameVideo } from './video-fixtures';

// A source the browser refuses at once, with no network.
const missing: MediaUrl = () => 'data:video/mp4;base64,AAAA';

const meta = {
  title: 'Design System/Primitives/Content/Video',
  component: Video,
  argTypes: kitArgTypes('Video'),
} satisfies Meta<typeof Video>;

export default meta;

type Story = StoryObj<typeof meta>;

// At rest the frame holds the poster image, with the controls over it.
export const StillFrame: Story = { args: stillFrameVideo };

export const Autoplay: Story = {
  args: autoplayVideo,
  parameters: {
    docs: { description: { story: 'A square frame, playing at once.' } },
  },
};

export const Failed: Story = {
  args: failedVideo,
  render: (args) => (
    <MediaUrlContext.Provider value={missing}>
      <Video {...args} />
    </MediaUrlContext.Provider>
  ),
};
