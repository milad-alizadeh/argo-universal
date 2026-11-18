import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Markdown } from './index';
import {
  arrivingMarkdown,
  headingsMarkdown,
  listsMarkdown,
  inlineMarkdown,
  quoteAndBreakMarkdown,
  codeMarkdown,
  tableMarkdown,
  streamingMarkdown,
  startingParagraphMarkdown,
} from './markdown-fixtures';

const meta = {
  title: 'Design System/Primitives/Content/Markdown',
  component: Markdown,
  argTypes: kitArgTypes('Markdown'),
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Headings: Story = { args: headingsMarkdown };

export const Lists: Story = { args: listsMarkdown };

export const Inline: Story = { args: inlineMarkdown };

export const QuoteAndBreak: Story = { args: quoteAndBreakMarkdown };

export const Code: Story = { args: codeMarkdown };

export const Table: Story = { args: tableMarkdown };

export const Streaming: Story = { args: streamingMarkdown };

const charsPerChunk = 14;

const msBetweenChunks = 90;

// Chunks to wait with the answer whole before it is written again.
const chunksAtRest = 20;

// The answer written a few words at a time, over and over, as an Agent's message streams.
function Written({ text }: { text: string }): React.JSX.Element {
  const [chunks, setChunks] = useState(1);
  const whole = Math.ceil(text.length / charsPerChunk) + chunksAtRest;
  useEffect(() => {
    const timer = setInterval(
      () => setChunks((sent) => (sent >= whole ? 1 : sent + 1)),
      msBetweenChunks,
    );

    return (): void => clearInterval(timer);
  }, [whole]);

  return <Markdown text={text.slice(0, chunks * charsPerChunk)} streaming />;
}

export const Arriving: Story = {
  args: arrivingMarkdown,
  render: ({ text }) => <Written text={text} />,
};

export const StartingParagraph: Story = { args: startingParagraphMarkdown };
