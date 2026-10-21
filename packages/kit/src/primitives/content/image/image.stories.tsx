import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { MediaUrlContext } from '#primitives/content/media-url';
import { Image } from './image';
import {
  containImage,
  failedImage,
  loadedImage,
  loadingImage,
} from './image-fixtures';

const meta = {
  title: 'Design System/Primitives/Content/Image',
  component: Image,
  argTypes: kitArgTypes('Image'),
} satisfies Meta<typeof Image>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loaded: Story = { args: loadedImage };

export const Contain: Story = { args: containImage };

export const Loading: Story = { args: loadingImage };

// A source the browser refuses at once, with no network.
export const Failed: Story = {
  args: failedImage,
  render: (args) => (
    <MediaUrlContext value={() => 'data:image/png;base64,broken'}>
      <Image {...args} />
    </MediaUrlContext>
  ),
};
