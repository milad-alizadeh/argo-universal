import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { ComposerAttachmentCard } from './composer-attachment-card';
import {
  imageAttachment,
  otherFileAttachment,
  oversizedAttachment,
  textFileAttachment,
} from './composer-attachment-card-fixtures';

const meta = {
  title: 'Composer/ComposerAttachmentCard',
  component: ComposerAttachmentCard,
  args: { ...imageAttachment, onRemove: action('remove') },
  argTypes: {
    attachment: { control: false },
    disabled: { control: 'boolean' },
    onRemove: { control: false },
  },
} satisfies Meta<typeof ComposerAttachmentCard>;

export default meta;

type Story = StoryObj<typeof meta>;

// An image fills the tile with its own preview.
export const Image: Story = { args: imageAttachment };

// A text file reads its first lines above its name.
export const TextFile: Story = { args: textFileAttachment };

// Any other file shows its kind and extension instead.
export const OtherFile: Story = { args: otherFileAttachment };

// Past the upload limit: the tile takes the danger border and the Composer blocks Send.
export const TooLarge: Story = { args: oversizedAttachment };
