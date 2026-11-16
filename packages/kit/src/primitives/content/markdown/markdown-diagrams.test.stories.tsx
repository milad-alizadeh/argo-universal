import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { Markdown } from './index';

const meta = {
  title: 'Tests/Design System/Primitives/Content/Markdown/Diagrams',
  component: Markdown,
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

const fence = '```mermaid\nflowchart LR\n  A[One] --> B[Two]\n```';

export const DrawsAMermaidFence: Story = {
  args: { text: `Before.\n\n${fence}\n\nAfter.` },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: 'Flowchart' }),
    ).toBeVisible();
    await expect(canvas.queryByTestId('code-text')).not.toBeInTheDocument();
  },
};

export const KeepsOtherFencesAsCode: Story = {
  args: { text: '```ts\nconst one = 1;\n```' },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('code-text')).toHaveTextContent(
      'const one = 1;',
    );
    await expect(canvas.queryByTestId('diagram')).not.toBeInTheDocument();
  },
};

export const HoldsAStreamingFence: Story = {
  args: {
    text: '```mermaid\nflowchart LR\n  A[One] --> B',
    streaming: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('diagram-placeholder')).toBeInTheDocument();
  },
};

// Only the last block streams: a closed fence above it draws while the text after it arrives.
export const DrawsAClosedFenceWhileStreaming: Story = {
  args: { text: `${fence}\n\nStill writ`, streaming: true },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: 'Flowchart' }),
    ).toBeVisible();
  },
};
