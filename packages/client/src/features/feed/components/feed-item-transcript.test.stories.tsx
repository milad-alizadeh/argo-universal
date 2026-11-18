import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { FeedItem, type FeedItemProps } from './feed-item';
import {
  personSaid,
  personSaying,
  voiceSaid,
  voiceSaying,
  words,
} from './transcript/transcript-fixtures';

const meta = {
  title: 'Tests/Feed/FeedItem/Transcript',
  globals: { mode: 'light' },
  component: FeedItem,
  args: { imageUrl: (): string => '' },
} satisfies Meta<typeof FeedItem>;

export default meta;

type Story = StoryObj<typeof meta>;

type Fixture = Pick<FeedItemProps, 'item'>;

const noImage = (): string => '';

// Two rows, as the Feed draws them one above the other.
const pair = (above: Fixture, below: Fixture) => (): React.JSX.Element => (
  <View className="w-full gap-4">
    <FeedItem item={above.item} imageUrl={noImage} />
    <FeedItem item={below.item} imageUrl={noImage} />
  </View>
);

const colorOf = (element: HTMLElement): string =>
  getComputedStyle(element).color;

export const PersonWordsMuteUntilFinal: Story = {
  args: personSaid,
  render: pair(personSaid, personSaying),
  play: async ({ canvas }) => {
    const final = await canvas.findByText(words.person);
    const partial = await canvas.findByText(words.personPartial);

    await expect(colorOf(partial)).not.toBe(colorOf(final));
  },
};

export const VoiceWordsMuteUntilFinal: Story = {
  args: voiceSaid,
  render: pair(voiceSaid, voiceSaying),
  play: async ({ canvas }) => {
    const final = await canvas.findByText(words.voice);
    const partial = await canvas.findByText(words.voicePartial);

    await expect(colorOf(partial)).not.toBe(colorOf(final));
  },
};

export const BothKindsDrawTheirWords: Story = {
  args: personSaid,
  render: pair(personSaid, voiceSaid),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(words.person)).toBeVisible();
    await expect(await canvas.findByText(words.voice)).toBeVisible();
  },
};
