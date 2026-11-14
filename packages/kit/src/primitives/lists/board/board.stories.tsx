import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { within } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Board } from './board';
import { BoardExample, EmptyBoard, PendingBoard } from './board.mocks';

const meta = {
  title: 'Design System/Primitives/Lists/Board',
  component: Board,
  argTypes: kitArgTypes('Board'),
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj;

// Drag a card, or open its menu, to move it; the columns it cannot land in fade while it is dragged.
export const Populated: Story = { render: () => <BoardExample /> };

export const Empty: Story = { render: () => <EmptyBoard /> };

// A move waiting on its owner shows the card in its new column with a spinner.
export const Pending: Story = { render: () => <PendingBoard /> };

export const PopulatedDark: Story = {
  render: () => <BoardExample />,
  globals: { mode: 'dark' },
};

// A phone draws every column at its full width; the board scrolls sideways to reach the rest.
export const PopulatedOnAPhone: Story = {
  render: () => <BoardExample />,
  globals: { viewport: { value: 'phone' } },
};

// Where the pointer goes, as a mouse event places it.
const at = (x: number, y: number): MouseEventInit => ({
  clientX: x,
  clientY: y,
});

/*
 * A card held over a column it does not name: the columns it cannot land in fade, and dropping it there moves
 * nothing. The play holds the card until the story is left.
 */
export const DisallowedDrop: Story = {
  render: () => <BoardExample />,
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole('button', { name: 'Sketch the layout' });
    const done = canvas.getByRole('group', { name: 'Done' });
    const from = card.getBoundingClientRect();
    const over = done.getBoundingClientRect();

    await userEvent.pointer([
      {
        target: card,
        coords: at(from.x + 40, from.y + 20),
        keys: '[MouseLeft>]',
      },
      { target: card, coords: at(from.x + 40, from.y + 32) },
      { target: card, coords: at(over.x + over.width / 2, over.y + 80) },
    ]);
  },
};
