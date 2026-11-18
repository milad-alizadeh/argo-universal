import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { Markdown } from './index';

const meta = {
  title: 'Tests/Design System/Primitives/Content/Markdown/Arriving',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const arrivingId = 'arriving-text';

// An answer as three chunks leave it: its first words, more of the same paragraph, then a second paragraph.
const secondParagraph = 'A second paragraph';

const answers = [
  'Hello',
  'Hello **bright** world',
  `Hello **bright** world again\n\n${secondParagraph}`,
];

function Answer({ streaming }: { streaming: boolean }): React.JSX.Element {
  const [sent, setSent] = useState(0);
  const text = answers[Math.min(sent, answers.length - 1)] ?? '';

  return (
    <Pressable testID="send" onPress={() => setSent((chunks) => chunks + 1)}>
      <View>
        <Markdown text={text} streaming={streaming} />
      </View>
    </Pressable>
  );
}

const isArriving = (node: Node): node is HTMLElement =>
  node instanceof HTMLElement && node.dataset.testid === arrivingId;

const arrivingIn = (node: Node): HTMLElement[] =>
  node instanceof HTMLElement
    ? [...node.querySelectorAll<HTMLElement>(`[data-testid="${arrivingId}"]`)]
    : [];

// Every piece of text drawn as arriving, in the order it was drawn. A piece is noted as it is added, so the note does not depend on how long its fade then lasts.
interface Noted {
  texts: string[];
  stop: () => void;
}

function noteArriving(root: HTMLElement): Noted {
  const texts: string[] = [];

  const observer = new MutationObserver((records) => {
    for (const node of records.flatMap((record) => [...record.addedNodes])) {
      const pieces = isArriving(node) ? [node] : arrivingIn(node);

      texts.push(...pieces.map((piece) => piece.textContent));
    }
  });

  observer.observe(root, { childList: true, subtree: true });

  const stop = (): void => observer.disconnect();

  return { texts, stop };
}

const fadeEndsWithin = { timeout: 3000 };

export const NewTextFadesInAndReadTextDoesNot: Story = {
  render: () => <Answer streaming />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const send = await canvas.findByTestId('send');
    await canvas.findByText('Hello');
    // Text already there when the message is first drawn does not fade.
    await expect(canvas.queryAllByTestId(arrivingId)).toEqual([]);

    const noted = noteArriving(canvasElement);

    await userEvent.click(send);
    await canvas.findByText('bright');
    await expect(noted.texts).toEqual([' ', 'bright', ' world']);

    await userEvent.click(send);
    await canvas.findByText(secondParagraph);
    // The end of the first paragraph and the whole of the second arrive in one commit, in either order.
    await expect(noted.texts.slice(3).toSorted()).toEqual([
      ' again',
      secondParagraph,
    ]);

    noted.stop();
    // Once the fades end the text is plain again, so nothing can fade a second time.
    await waitFor(
      () => expect(canvas.queryAllByTestId(arrivingId)).toEqual([]),
      fadeEndsWithin,
    );
  },
};

export const SettledTextNeverFades: Story = {
  render: () => <Answer streaming={false} />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const send = await canvas.findByTestId('send');
    const noted = noteArriving(canvasElement);

    await userEvent.click(send);
    await canvas.findByText('bright');
    await userEvent.click(send);
    await canvas.findByText(secondParagraph);
    noted.stop();

    await expect(noted.texts).toEqual([]);
  },
};
