import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { PromptQueue } from './prompt-queue';
import { queuedPrompts } from './prompt-queue-fixtures';
import { QueueComposerExample } from './queue-composer.mocks';

const meta = {
  title: 'Tests/Composer/PromptQueue/Pointer',
  component: PromptQueue,
  args: { ...queuedPrompts, command: fn(async (): Promise<void> => {}) },
  render: (args): ReactElement => <QueueComposerExample {...args} />,
} satisfies Meta<typeof PromptQueue>;

export default meta;

type Story = StoryObj<typeof meta>;

type Context = Parameters<NonNullable<Story['play']>>[0];

const rowId = 'queued-prompt-row';

function pointerAt(width: number): Story {
  return {
    play: async (context) => {
      await settleLayout(width);
      await checkCursors(context.canvas);
      await checkDrag(context);
    },
  };
}

export const Phone = pointerAt(390);

export const NarrowWindow = pointerAt(900);

export const Wide = pointerAt(1280);

async function checkCursors(canvas: Context['canvas']): Promise<void> {
  const row = first(canvas.getAllByTestId(rowId));
  const grip = first(canvas.getAllByTestId('queue-reorder-grip'));
  await expect(cursorAt(row)).toBe('auto');
  await expect(cursorAt(grip)).toBe('grab');
  await expect(
    cursorAt(
      first(canvas.getAllByRole('button', { name: 'Edit Queued Prompt' })),
    ),
  ).toBe('pointer');
  await expect(
    cursorAt(
      first(canvas.getAllByRole('button', { name: 'Delete Queued Prompt' })),
    ),
  ).toBe('pointer');
  const rows = canvas.getAllByTestId(rowId);
  await expect(row.getBoundingClientRect().height).toBe(28);
  await expect(
    canvas.getByTestId('prompt-queue').getBoundingClientRect().height,
  ).toBe(
    rows.reduce((sum, item) => sum + item.getBoundingClientRect().height, 0),
  );
}

function first(elements: HTMLElement[]): HTMLElement {
  const item = elements[0];

  if (!item) throw new Error('Expected a queue control');

  return item;
}

function cursorAt(element: HTMLElement): string {
  const box = element.getBoundingClientRect();

  const target = document.elementFromPoint(
    box.x + box.width / 2,
    box.y + box.height / 2,
  );

  if (!target) throw new Error('Expected a hit-tested queue control');

  return getComputedStyle(target).cursor;
}

async function checkDrag({ canvas, userEvent, args }: Context): Promise<void> {
  const rows = canvas.getAllByTestId(rowId);
  const source = rows[1];
  const target = first(rows);

  if (!source) throw new Error('Expected a second queue item');
  await drag(source, target, userEvent);
  await expect(args.command).not.toHaveBeenCalled();
  await drag(
    first([
      ...source.querySelectorAll<HTMLElement>(
        '[data-testid="queue-reorder-grip"]',
      ),
    ]),
    target,
    userEvent,
  );
  await waitFor(() =>
    expect(args.command).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'move',
        id: 'second',
        beforeId: 'first',
      }),
    ),
  );
}

async function drag(
  source: HTMLElement,
  target: HTMLElement,
  user: Context['userEvent'],
): Promise<void> {
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const clientX = from.x + from.width / 2;
  const clientY = from.y + from.height / 2;
  await user.pointer([
    { target: source, coords: { clientX, clientY }, keys: '[MouseLeft>]' },
    { target: source, coords: { clientX, clientY: clientY + 12 } },
    { target: source, coords: { clientX, clientY: to.y + 2 } },
    { target: source, keys: '[/MouseLeft]' },
  ]);
}
