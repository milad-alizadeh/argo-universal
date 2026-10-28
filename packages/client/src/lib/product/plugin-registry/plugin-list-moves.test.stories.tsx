import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  boardListRoot,
  queueListRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/ListMoves',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onEvent = fn();

// The board as a Plugin sends it: JSON over the wire.
const board: WireNode = JSON.parse(JSON.stringify(boardListRoot));

export const BoardRowMovesToAnotherLane: Story = {
  beforeEach: async () => {
    onEvent.mockClear();
    await settleLayout('wide');
  },
  render: () => <PluginTree root={board} onEvent={onEvent} />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const row = await canvas.findByRole('button', { name: 'Fix login' });

    await userEvent.pointer({ target: row, keys: '[MouseRight]' });

    const menu = await within(canvasElement.ownerDocument.body).findByRole(
      'menu',
    );

    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'Move to…' }),
    );

    const picker = await within(canvasElement.ownerDocument.body).findByRole(
      'dialog',
      { name: 'Move to' },
    );

    // Done is the board's last Section, and empty, so its one place is the last Top.
    const doneTop = within(picker)
      .getAllByRole('button', { name: 'Top' })
      .at(-1);

    if (doneTop) await userEvent.click(doneTop);

    await expect(onEvent).toHaveBeenCalledWith('board', {
      event: 'onMove',
      payload: { id: 'login', section: 'done', index: 0 },
    });
  },
};

const queue: WireNode = JSON.parse(JSON.stringify(queueListRoot));

// Every lower card declares Alt+↑: Argo declares the Move Actions, so the focused card answers, not the first.
export const FocusedRowMovesFromKeyboard: Story = {
  beforeEach: async () => {
    onEvent.mockClear();
    await settleLayout('wide');
  },
  render: () => <PluginTree root={queue} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    const row = await canvas.findByRole('button', { name: 'Third card' });

    row.focus();
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');

    await expect(onEvent.mock.calls).toEqual([
      [
        'queue',
        {
          event: 'onMove',
          payload: { id: 'third', section: 'queue', index: 1 },
        },
      ],
    ]);
  },
};
