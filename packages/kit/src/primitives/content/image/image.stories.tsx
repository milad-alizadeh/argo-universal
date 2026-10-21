import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { MediaUrlContext } from '#primitives/content/media-url';
import { Variation, Variations as VariationList } from '../../../variations';
import { Image } from './image';

const meta = {
  title: 'Design System/Primitives/Content/Image',
  component: Image,
  argTypes: kitArgTypes('Image'),
} satisfies Meta;

export default meta;

type Story = StoryObj;

const asset = {
  pluginId: 'hello',
  hash: 'a'.repeat(64),
  format: 'jpeg',
} as const;

const examples = [
  {
    label: 'Loaded',
    example: (
      <Image
        source={asset}
        aspect={4 / 3}
        radius="container"
        accessibilityLabel="Screenshot"
      />
    ),
  },
  {
    label: 'Contain',
    example: (
      <Image
        source={asset}
        aspect={1}
        fit="contain"
        radius="control"
        accessibilityLabel="Full screenshot"
      />
    ),
  },
  {
    label: 'Loading',
    example: <Image aspect={16 / 9} accessibilityLabel="Loading screenshot" />,
  },
  {
    label: 'Error',
    example: (
      <MediaUrlContext value={() => 'data:image/png;base64,broken'}>
        <Image source={asset} accessibilityLabel="Missing screenshot" />
      </MediaUrlContext>
    ),
  },
];

export const Variations: Story = {
  name: 'Image',
  render: () => (
    <VariationList>
      {examples.map(({ label, example }) => (
        <Variation key={label} label={label}>
          {example}
        </Variation>
      ))}
    </VariationList>
  ),
};
