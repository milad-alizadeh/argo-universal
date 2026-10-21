import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { Markdown } from './index';

const meta = {
  title: 'Tests/Markdown',
  component: Markdown,
  args: { text: '# Overview\n\n## Details\n\n3. Third\n4. Fourth' },
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HeadingsAndOrderedLists: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Overview' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('heading', { level: 2, name: 'Details' }),
    ).toBeVisible();
    await expect(canvas.getByText('3.')).toBeVisible();
    await expect(canvas.getByText('4.')).toBeVisible();
  },
};

export const TableContent: Story = {
  args: { text: '| Name | Value |\n| --- | --- |\n| **Item** | `42` |' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('columnheader', { name: 'Name' }),
    ).toBeVisible();
    await expect(canvas.getByRole('cell', { name: 'Item' })).toBeVisible();
    await expect(canvas.getByRole('cell', { name: '42' })).toBeVisible();
  },
};

export const FenceUsesCode: Story = {
  args: { text: '```sh\necho ready\n```' },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('code-text')).toHaveTextContent(
      'echo ready',
    );
    await expect(
      canvas.getByRole('button', { name: 'Copy code' }),
    ).toBeInTheDocument();
  },
};

export const Streaming: Story = {
  args: { text: 'Text arriving', streaming: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Text arriving')).toBeVisible();
    await expect(canvas.getByTestId('streaming-caret')).toBeVisible();
  },
};

export const QuoteAndInlineContent: Story = {
  args: { text: '> **Strong**, *emphasis*, ~~removed~~, and `value`.' },
  play: async ({ canvas }) => {
    for (const label of ['Strong', 'emphasis', 'removed', 'value'])
      await expect(canvas.getByText(label)).toBeVisible();
  },
};
