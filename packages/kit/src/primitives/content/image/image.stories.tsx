import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { MediaUrlContext } from '#primitives/content/media-url';
import { Image } from './image';

const asset = {
  pluginId: 'hello',
  hash: 'a'.repeat(64),
  format: 'jpeg',
} as const;

const meta = {
  title: 'Design System/Primitives/Content/Image',
  component: Image,
  args: { accessibilityLabel: 'Screenshot' },
  argTypes: kitArgTypes('Image'),
} satisfies Meta<typeof Image>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loaded: Story = {
  args: { source: asset, aspect: 4 / 3, radius: 'container' },
};

export const Contain: Story = {
  args: {
    source: asset,
    aspect: 1,
    fit: 'contain',
    radius: 'control',
    accessibilityLabel: 'Full screenshot',
  },
};

export const Loading: Story = {
  args: { aspect: 16 / 9, accessibilityLabel: 'Loading screenshot' },
};

// A source the browser refuses at once, with no network.
export const Failed: Story = {
  args: { source: asset, accessibilityLabel: 'Missing screenshot' },
  render: (args) => (
    <MediaUrlContext value={() => 'data:image/png;base64,broken'}>
      <Image {...args} />
    </MediaUrlContext>
  ),
};
