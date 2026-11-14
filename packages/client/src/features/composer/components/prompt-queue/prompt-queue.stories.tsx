import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { PromptQueue } from './prompt-queue';
import {
  queuedPrompts,
  pausedPrompts,
  editingElsewhere,
} from './prompt-queue-fixtures';

const meta = {
  title: 'Composer/PromptQueue',
  component: PromptQueue,
  args: { ...queuedPrompts, command: fn(async (): Promise<void> => {}) },
} satisfies Meta<typeof PromptQueue>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Queued: Story = {};

export const Paused: Story = { args: pausedPrompts };

export const HeldInAnotherApp: Story = { args: editingElsewhere };

export const Editing: Story = {
  play: async ({ canvas, userEvent }) => {
    const [button] = canvas.getAllByRole('button', {
      name: 'Edit Queued Prompt',
    });

    if (!button) throw new Error('Expected an editable Queued Prompt');
    await userEvent.click(button);
  },
};
