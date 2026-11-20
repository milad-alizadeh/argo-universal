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

// A drag from the row body moves nothing; a drag from the grip reorders.
export const DragsFromTheGrip: Story = {
  play: async (context) => {
    await settleLayout('wide');
    await checkDrag(context);
  },
};

function first(elements: HTMLElement[]): HTMLElement {
  const item = elements[0];

  if (!item) throw new Error('Expected a queue control');

  return item;
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
