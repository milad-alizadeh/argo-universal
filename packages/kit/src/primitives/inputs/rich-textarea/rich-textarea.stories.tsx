import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { RichTextarea } from './rich-textarea';
import {
  exampleLabel,
  RichTextareaExample,
} from './rich-textarea-example.mocks';

const longDraft = Array.from(
  { length: 14 },
  (_, index) => `Line ${index + 1} of a long draft`,
).join('\n');

const meta = {
  title: 'Design System/Primitives/Inputs/RichTextarea',
  component: RichTextarea,
  args: {
    value: '',
    accessibilityLabel: exampleLabel,
    onChangeText: (): void => {},
  },
  // RichTextarea has no Contracts schema; these are the props its own type declares as opaque.
  argTypes: {
    onChangeText: { control: false },
    onSubmit: { control: false },
    references: { control: false },
  },
  // The editor is controlled, so every story draws through a wrapper that keeps the draft.
  render: ({ value, ...props }): React.JSX.Element => (
    <RichTextareaExample initialValue={value} {...props} />
  ),
} satisfies Meta<typeof RichTextarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Bold: Story = { args: { value: 'Keep the **phone** readable.' } };

export const Italic: Story = { args: { value: 'Keep the _phone_ readable.' } };

export const Strikethrough: Story = {
  args: { value: 'Keep the ~~tablet~~ phone readable.' },
};

export const InlineCode: Story = {
  args: { value: 'Run `pnpm test` before you push.' },
};

export const Link: Story = {
  args: {
    value: 'Read the [the guide](https://example.com/guide) before you start.',
  },
};

export const ThreeLines: Story = {
  args: {
    value: 'Match the spacing.\nKeep the phone readable.\nUse both themes.',
  },
};

export const Headings: Story = {
  args: {
    value: '# Title heading\n\n## Second heading\n\nBody text for comparison',
  },
};

export const NestedLists: Story = {
  args: {
    value:
      '- Plan the layout\n    - Draft the rows\n        - Outline\n- Ship\n\n1. Build\n    1. Test\n2. Release',
  },
};

export const Quote: Story = {
  args: { value: '> Keep the phone readable.\n> Use both themes.' },
};

export const CodeBlock: Story = {
  args: { value: 'Run this first:\n\n```\npnpm install\npnpm test\n```' },
};

export const LongDraft: Story = {
  args: { value: longDraft },
  parameters: {
    docs: { description: { story: 'A draft at the editor’s maximum height.' } },
  },
};
