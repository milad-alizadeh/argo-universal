import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import {
  composerFiles,
  composerImages,
  oversizedComposerImage,
} from '../../../../../mocks/composer-mock';
import {
  type ComposerAttachment,
  ComposerAttachmentCard,
} from './composer-attachment-card';

const [image] = composerImages;

const [textFile, otherFile] = composerFiles;

if (!image || !textFile || !otherFile)
  throw new Error(
    'Composer mocks need an image, a text file and another file.',
  );

const states: [string, ComposerAttachment][] = [
  ['Image', image],
  ['Text file', textFile],
  ['Other file', otherFile],
  ['Too large', oversizedComposerImage],
];

const meta = {
  title: 'Composer/ComposerAttachmentCard',
  component: ComposerAttachmentCard,
  args: { attachment: image, disabled: false, onRemove: action('remove') },
} satisfies Meta<typeof ComposerAttachmentCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ComposerAttachmentCardStates: Story = {
  name: 'ComposerAttachmentCard',
  render: (args): React.JSX.Element => (
    <Variations>
      {states.map(([label, attachment]) => (
        <Variation key={label} label={label}>
          <ComposerAttachmentCard {...args} attachment={attachment} />
        </Variation>
      ))}
    </Variations>
  ),
};
