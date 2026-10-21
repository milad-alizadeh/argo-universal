import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { type MediaUrl, MediaUrlContext } from '#primitives/content/media-url';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
import { Audio } from './audio';
import { AudioTransport, type AudioTransportProps } from './audio-transport';

const meta = {
  title: 'Design System/Primitives/Content/Audio',
  component: Audio,
  argTypes: kitArgTypes('Audio'),
} satisfies Meta;

export default meta;

type Story = StoryObj;

const chime = {
  pluginId: 'hello',
  hash: 'a'.repeat(64),
  format: 'mp3',
} as const;

// A source the browser refuses at once, with no network.
const missing: MediaUrl = () => 'data:audio/mpeg;base64,AAAA';

const ignore = (): void => undefined;

const transport = {
  label: 'Chime',
  onToggle: ignore,
  onSeek: ignore,
} satisfies Partial<AudioTransportProps>;

const examples: { label: string; example: React.JSX.Element }[] = [
  {
    label: 'Paused',
    example: <Audio source={chime} accessibilityLabel="Chime" />,
  },
  {
    label: 'Playing',
    example: (
      <AudioTransport
        {...transport}
        phase="playing"
        currentTime={47}
        duration={192}
      />
    ),
  },
  {
    label: 'Loading',
    example: (
      <AudioTransport
        {...transport}
        phase="loading"
        currentTime={0}
        duration={0}
      />
    ),
  },
  {
    label: 'Error',
    example: (
      <MediaUrlContext.Provider value={missing}>
        <Audio source={chime} accessibilityLabel="Chime" />
      </MediaUrlContext.Provider>
    ),
  },
];

export const Variations: Story = {
  name: 'Audio',
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
