import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
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
  longCellTableMarkdown,
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

export const TableLongCells: Story = { args: longCellTableMarkdown };

export const Streaming: Story = { args: streamingMarkdown };

const charsPerChunk = 14;

const msBetweenChunks = 90;

// Play a single response in the same fixed column throughout the stream.
function Written({ text }: { text: string }): React.JSX.Element {
  const [length, setLength] = useState(charsPerChunk);
  const streaming = length < text.length;
  useEffect(() => {
    if (!streaming) return;

    const timer = setTimeout(
      () => setLength(length + charsPerChunk),
      msBetweenChunks,
    );

    return (): void => clearTimeout(timer);
  }, [length, streaming]);

  return (
    <View className="mx-auto w-full max-w-column px-6 pt-6">
      <Markdown text={text.slice(0, length)} streaming={streaming} />
    </View>
  );
}

export const Arriving: Story = {
  args: arrivingMarkdown,
  parameters: { screenPreview: true },
  render: ({ text }) => <Written text={text} />,
};

export const StartingParagraph: Story = { args: startingParagraphMarkdown };
