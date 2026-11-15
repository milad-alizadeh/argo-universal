import type { QueueCommand } from '@repo/contracts';
import { shownText } from '@repo/kit/mocks/shown-text';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { PromptQueue } from './prompt-queue';
import { queuedPrompts } from './prompt-queue-fixtures';
import { QueueComposerExample } from './queue-composer.mocks';

const meta = {
  title: 'Tests/Composer/PromptQueue',
  component: PromptQueue,
  render: (args): ReactElement => <QueueComposerExample {...args} />,
  args: { ...queuedPrompts, command: fn(async (): Promise<void> => {}) },
} satisfies Meta<typeof PromptQueue>;

export default meta;

type Story = StoryObj<typeof meta>;

const firstPrompt = 'Add tests for the settings screen';

const editLabel = 'Edit Queued Prompt';

const keptDraft = 'Keep my existing draft';

const cancelLabel = 'Cancel queue edit';

// Web's list is a plain element: a native-only scroll prop lands on it as an attribute, and React warns.
export const WebListTakesNoNativeProps: Story = {
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByText(firstPrompt);
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
      canvas.getAllByRole('button', { name: editLabel }),
    ).toHaveLength(2);
    await expect(
      canvas.getAllByRole('button', { name: 'Delete Queued Prompt' }),
    ).toHaveLength(2);
  },
};

export const SendSavesTheQueuedItem: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await beginEdit({ canvas, userEvent });
    const field = canvas.getByRole('textbox', { name: 'Message' });
    await expect(shownText(field)).toBe(firstPrompt);
    await userEvent.clear(field);
    await userEvent.type(field, 'Updated queued prompt');
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(field).not.toBeInTheDocument();
    await expect(
      shownText(canvas.getByRole('textbox', { name: 'Message' })),
    ).toBe(keptDraft);
    await expect(canvas.getAllByRole('group')).toHaveLength(2);
    await expect(canvas.getAllByRole('group')[0]).toHaveAccessibleName(
      'Updated queued prompt',
    );
    await expect(args.command).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'save', id: 'first', revision: 0 }),
    );
  },
};

export const CancelRestoresComposerDraft: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await beginEdit({ canvas, userEvent });
    const field = canvas.getByRole('textbox', { name: 'Message' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Discard these edits');
    await userEvent.click(canvas.getByRole('button', { name: cancelLabel }));
    await expect(
      shownText(canvas.getByRole('textbox', { name: 'Message' })),
    ).toBe(keptDraft);
    await expect(canvas.getAllByRole('group')[0]).toHaveAccessibleName(
      firstPrompt,
    );
    await expect(args.command).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'release', id: 'first' }),
    );
    await expect(args.command).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'save' }),
    );
  },
};

type EditContext = Pick<
  Parameters<NonNullable<Story['play']>>[0],
  'canvas' | 'userEvent'
>;

async function beginEdit({ canvas, userEvent }: EditContext): Promise<void> {
  const [button] = canvas.getAllByRole('button', { name: editLabel });

  if (!button) throw new Error('Expected an editable queue item');
  await userEvent.click(button);
}

export const FailedSaveKeepsComposerEdit: Story = {
  args: { command: fn(refuseSave) },
  play: async ({ canvas, userEvent }) => {
    await beginEdit({ canvas, userEvent });
    const field = canvas.getByRole('textbox', { name: 'Message' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Keep the failed edit');
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    const cancel = canvas.getByRole('button', { name: cancelLabel });
    await waitFor(() => expect(cancel).toBeEnabled());
    await expect(shownText(field)).toBe('Keep the failed edit');
    await expect(canvas.getAllByRole('group')[0]).toHaveAccessibleName(
      firstPrompt,
    );
    await userEvent.click(cancel);
    await expect(
      shownText(canvas.getByRole('textbox', { name: 'Message' })),
    ).toBe(keptDraft);
  },
};

async function refuseSave(command: QueueCommand): Promise<void> {
  if (command.action === 'save') throw new Error('Save rejected');
}
