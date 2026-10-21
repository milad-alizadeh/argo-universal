import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { type MediaUrl, MediaUrlContext } from '#primitives/content/media-url';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
import { Video } from './video';

const meta = {
  title: 'Design System/Primitives/Content/Video',
  component: Video,
  argTypes: kitArgTypes('Video'),
} satisfies Meta;

export default meta;

type Story = StoryObj;

const hash = 'a'.repeat(64);

const clip = { pluginId: 'hello', hash, format: 'mp4' } as const;

const poster = { pluginId: 'hello', hash, format: 'jpeg' } as const;

// A source the browser refuses at once, with no network.
const missing: MediaUrl = () => 'data:video/mp4;base64,AAAA';

const examples: { label: string; example: React.JSX.Element }[] = [
  {
    label: 'With poster',
    example: (
      <Video source={clip} poster={poster} accessibilityLabel="Demo clip" />
    ),
  },
  {
    label: 'Square, autoPlay',
    example: (
      <Video source={clip} aspect="square" autoPlay accessibilityLabel="Loop" />
    ),
  },
  {
    label: 'Error',
    example: (
      <MediaUrlContext.Provider value={missing}>
        <Video source={clip} accessibilityLabel="Demo clip" />
      </MediaUrlContext.Provider>
    ),
  },
];

export const Variations: Story = {
  name: 'Video',
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
