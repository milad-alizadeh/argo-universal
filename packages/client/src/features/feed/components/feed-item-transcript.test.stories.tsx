import type { ConversationPartial } from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { expect, waitFor, type within } from 'storybook/test';
import { feedItemKey, type FeedViewItem } from '../view/feed-view';
import { withPartialTranscripts } from '../view/with-partial-transcripts';
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

export const ConversationWordsMuteUntilFinal: Story = {
  args: voiceSaid,
  render: withMutedProbe(voiceSaid, voiceSaying),
  play: ({ canvas }) =>
    expectMutedUntilFinal(canvas, {
      final: words.voice,
      partial: words.conversationPartial,
    }),
};

const arrivingId = 'arriving-text';

const arrivingIn = (node: Node): HTMLElement[] => {
  if (!(node instanceof HTMLElement)) return [];

  const inside = [
    ...node.querySelectorAll<HTMLElement>(`[data-testid="${arrivingId}"]`),
  ];

  return node.dataset.testid === arrivingId ? [node, ...inside] : inside;
};

// Every piece of text drawn as arriving, in the order it was drawn.
interface Noted {
  texts: string[];
  stop: () => void;
}

function noteArriving(root: HTMLElement): Noted {
  const texts: string[] = [];

  const observer = new MutationObserver((records) => {
    for (const node of records.flatMap((record) => [...record.addedNodes]))
      texts.push(...arrivingIn(node).map((piece) => piece.textContent));
  });

  observer.observe(root, { childList: true, subtree: true });

  return { texts, stop: (): void => observer.disconnect() };
}

// How the words of one utterance reach the Feed: growing while said, then stored as the final row.
const spoken = {
  first: 'The shell already',
  grown: 'The shell already switches at 720 px',
};

// One speaker's row, as the fixtures store it.
interface Spoken {
  speaker: ConversationPartial['speaker'];
  item: typeof personSaid.item | typeof voiceSaid.item;
}

const partialOf = ({ speaker, item }: Spoken, text: string): ConversationPartial => ({
  speaker,
  id: item.row.messageId,
  rowId: item.row.id,
  text,
});

const finalOf = ({ item }: Spoken, text: string): FeedViewItem => ({
  ...item,
  row: { ...item.row, content: [{ type: 'text', text }] },
});

// The Feed's items at each step: the first words, more of them, then the stored row with no partial left.
const stepsOf = (fixture: Spoken): FeedViewItem[][] => [
  withPartialTranscripts([], [partialOf(fixture, spoken.first)], 'session-1'),
  withPartialTranscripts([], [partialOf(fixture, spoken.grown)], 'session-1'),
  withPartialTranscripts([finalOf(fixture, spoken.grown)], [], 'session-1'),
];

// The tail of a Feed, keyed as the Feed keys its rows, moved on a step by each press.
const speaking = (fixture: Spoken) =>
  function Speaking(): React.JSX.Element {
    const steps = stepsOf(fixture);
    const [step, setStep] = useState(0);
    const items = steps[Math.min(step, steps.length - 1)] ?? [];

    return (
      <View
        className="w-full gap-4"
        testID={step >= steps.length - 1 ? 'final' : 'saying'}
      >
        <Pressable role="button" onPress={() => setStep((at) => at + 1)}>
          <Text role="secondary">Next</Text>
        </Pressable>
        {items.map((item) => (
          <View key={feedItemKey(item)} testID="spoken">
            <FeedItem item={item} imageUrl={noImage} />
          </View>
        ))}
      </View>
    );
  };

const fadeEndsWithin = { timeout: 3000 };

/*
 * Words still being said fade in as they arrive, as an Agent message's do. Once final, the same row
 * stays on screen: nothing is drawn again, so nothing fades a second time.
 */
async function expectFadeThenOneRow({
  canvas,
  canvasElement,
  userEvent,
}: Parameters<NonNullable<Story['play']>>[0]): Promise<void> {
  const next = await canvas.findByRole('button', { name: 'Next' });
  const row = await canvas.findByTestId('spoken');
  await expect(canvas.queryAllByTestId(arrivingId)).toEqual([]);

  const growing = noteArriving(canvasElement);
  await userEvent.click(next);
  await waitFor(() => expect(growing.texts.join('')).toContain('switches'));
  growing.stop();

  await waitFor(
    () => expect(canvas.queryAllByTestId(arrivingId)).toEqual([]),
    fadeEndsWithin,
  );

  const final = noteArriving(canvasElement);
  await userEvent.click(next);
  await canvas.findByTestId('final');
  final.stop();

  await expect(canvas.getAllByTestId('spoken')).toEqual([row]);
  await expect(row.isConnected).toBe(true);
  await expect(final.texts).toEqual([]);
}

export const ConversationWordsFadeInAndStayOneRowWhenFinal: Story = {
  args: voiceSaid,
  render: speaking({ speaker: 'voice', ...voiceSaid }),
  play: expectFadeThenOneRow,
};

export const PersonWordsFadeInAndStayOneRowWhenFinal: Story = {
  args: personSaid,
  render: speaking({ speaker: 'person', ...personSaid }),
  play: expectFadeThenOneRow,
};
