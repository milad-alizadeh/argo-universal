import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Markdown } from './index';
import {
  headingsMarkdown,
  listsMarkdown,
  inlineMarkdown,
  quoteAndBreakMarkdown,
  codeMarkdown,
  tableMarkdown,
  streamingMarkdown,
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
