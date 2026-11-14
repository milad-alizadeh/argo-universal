import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PromptQueue } from './prompt-queue';
import { queuedPrompts } from './prompt-queue-fixtures';

const meta = {
  title: 'Tests/Composer/PromptQueue',
  component: PromptQueue,
  args: { ...queuedPrompts, command: fn(async (): Promise<void> => {}) },
} satisfies Meta<typeof PromptQueue>;

export default meta;

type Story = StoryObj<typeof meta>;

// Web's list is a plain element: a native-only scroll prop lands on it as an attribute, and React warns.
export const WebListTakesNoNativeProps: Story = {
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByText('Add tests for the settings screen');
    await expect(
      canvasElement.querySelector('[keyboardshouldpersisttaps]'),
    ).toBeNull();
  },
};

export const CompactStackedRows: Story = {
  play: async ({ canvas }) => {
    const rows = await canvas.findAllByRole('group');
    const [first, second] = rows;

    if (!first || !second) throw new Error('Expected two queued rows');

    const top = first.getBoundingClientRect();
    const bottom = second.getBoundingClientRect();
    await expect(bottom.top).toBeGreaterThanOrEqual(top.bottom);
    await expect(bottom.top - top.bottom).toBeLessThan(8);
    await expect(canvas.queryByText('Queued Prompts')).toBeNull();
    await expect(
      canvas.getAllByRole('button', { name: 'Edit Queued Prompt' }),
    ).toHaveLength(2);
    await expect(
      canvas.getAllByRole('button', { name: 'Delete Queued Prompt' }),
    ).toHaveLength(2);
  },
};
