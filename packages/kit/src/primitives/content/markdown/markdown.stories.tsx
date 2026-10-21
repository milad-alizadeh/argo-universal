import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Markdown } from './index';

const meta = {
  title: 'Design System/Primitives/Content/Markdown',
  component: Markdown,
  argTypes: kitArgTypes('Markdown'),
  args: { text: '' },
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Headings: Story = {
  args: {
    text: '# Overview\n\nA short introduction.\n\n## Details\n\nMore information.\n\n### Notes',
  },
};

export const Lists: Story = {
  args: {
    text: 'A paragraph.\n\n3. Third item\n4. Fourth item\n   - Nested item',
  },
};

export const Inline: Story = {
  args: {
    text: '**Bold**, *italic*, ~~removed~~, `value`, and [a page](https://example.com).',
  },
};

export const QuoteAndBreak: Story = {
  args: { text: '> A quoted note.\n\n---\n\nThe next paragraph.' },
};

export const Code: Story = { args: { text: '```ts\nconst value = 42;\n```' } };

export const Table: Story = {
  args: { text: '| Name | Value |\n| --- | --- |\n| Size | Small |' },
};

export const Streaming: Story = {
  args: { text: 'Text arriving', streaming: true },
};
