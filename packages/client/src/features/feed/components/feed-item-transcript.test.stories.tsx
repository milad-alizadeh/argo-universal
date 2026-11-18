import { Text } from '@repo/kit/primitives/content/text';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, type within } from 'storybook/test';
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

const mutedProbe = 'Muted probe';

// A final row above a partial one, with a known muted-foreground element to read that colour from.
const withMutedProbe =
  (final: Fixture, partial: Fixture) => (): React.JSX.Element => (
    <View className="w-full gap-4">
      {pair(final, partial)()}
      <Text role="secondary" tone="muted">
        {mutedProbe}
      </Text>
    </View>
  );

type Canvas = ReturnType<typeof within>;

async function expectMutedUntilFinal(
  canvas: Canvas,
  words: { final: string; partial: string },
): Promise<void> {
  const final = await canvas.findByText(words.final);
  const partial = await canvas.findByText(words.partial);
  const muted = colorOf(await canvas.findByText(mutedProbe));

  await expect(final).toBeVisible();
  await expect(colorOf(partial)).toBe(muted);
  await expect(colorOf(final)).not.toBe(muted);
}

export const PersonWordsMuteUntilFinal: Story = {
  args: personSaid,
  render: withMutedProbe(personSaid, personSaying),
  play: ({ canvas }) =>
    expectMutedUntilFinal(canvas, {
      final: words.person,
      partial: words.personPartial,
    }),
};

export const VoiceWordsMuteUntilFinal: Story = {
  args: voiceSaid,
  render: withMutedProbe(voiceSaid, voiceSaying),
  play: ({ canvas }) =>
    expectMutedUntilFinal(canvas, {
      final: words.voice,
      partial: words.voicePartial,
    }),
};
