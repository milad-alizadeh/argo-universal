import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { RichTextarea } from './rich-textarea';
import { RichTextareaExample } from './rich-textarea-example.mocks';
import {
  boldRichTextarea,
  codeBlockRichTextarea,
  emptyRichTextarea,
  headingsRichTextarea,
  inlineCodeRichTextarea,
  italicRichTextarea,
  linkRichTextarea,
  longDraftRichTextarea,
  nestedListsRichTextarea,
  quoteRichTextarea,
  strikethroughRichTextarea,
  threeLinesRichTextarea,
  suggestionsRichTextarea,
} from './rich-textarea-fixtures';

const meta = {
  title: 'Design System/Primitives/Controls/RichTextarea',
  component: RichTextarea,
  args: { onChangeText: (): void => {} },
  // RichTextarea has no Contracts schema; these are the props its own type declares as opaque.
  argTypes: {
    onChangeText: { control: false },
    onSubmit: { control: false },
    references: { control: false },
    suggestions: { control: false },
  },
  // The editor is controlled, so every story draws through a wrapper that keeps the draft.
  render: ({ value, ...props }): React.JSX.Element => (
    <RichTextareaExample initialValue={value} {...props} />
  ),
} satisfies Meta<typeof RichTextarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: emptyRichTextarea };

export const Bold: Story = { args: boldRichTextarea };

export const Italic: Story = { args: italicRichTextarea };

export const Strikethrough: Story = { args: strikethroughRichTextarea };

export const InlineCode: Story = { args: inlineCodeRichTextarea };

export const Link: Story = { args: linkRichTextarea };

export const ThreeLines: Story = { args: threeLinesRichTextarea };

export const Headings: Story = { args: headingsRichTextarea };

export const NestedLists: Story = { args: nestedListsRichTextarea };

export const Quote: Story = { args: quoteRichTextarea };

export const CodeBlock: Story = { args: codeBlockRichTextarea };

export const LongDraft: Story = {
  args: longDraftRichTextarea,
  parameters: {
    docs: { description: { story: 'A draft at the editor’s maximum height.' } },
  },
};

export const Suggestions: Story = { args: suggestionsRichTextarea };
