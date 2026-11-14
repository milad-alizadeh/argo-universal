import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import {
  centre,
  coords,
  itemNames,
  laneNamed,
  openRowMenu,
  rowNamed,
} from '../list/list-move-pointer.mocks';
import { BoardExample, boardCards, boardColumns } from './board.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/Board',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Play = NonNullable<Story['play']>;

type Width = 'phone' | 'wide';

const onMove = fn();

// Recorded catalog: Sketch the layout sits In progress and may go back to Backlog or on to In review.
const sketch = boardCards.find((card) => card.id === 'c');

if (sketch?.column !== 'doing' || sketch.movesTo.join() !== 'backlog,review')
  throw new Error(
    'Recorded catalog needs Sketch the layout In progress, moving to Backlog or In review',
  );

const columnTitle = (id: string): string =>
  boardColumns.find((column) => column.id === id)?.title ?? id;

function at(width: Width, play: Play): Story {
  return {
    beforeEach: async () => {
      onMove.mockClear();
      await settleLayout(width);
    },
    render: () => <BoardExample onMove={onMove} />,
    play,
  };
}

// Takes a card past the mouse's slop and holds it over `over`, without letting go.
async function hold(
  user: Parameters<Play>[0]['userEvent'],
  card: HTMLElement,
  over: HTMLElement,
): Promise<void> {
  const from = centre(card);

  await user.pointer([
    { target: card, coords: coords(from), keys: '[MouseLeft>]' },
    { target: card, coords: coords({ x: from.x, y: from.y + 12 }) },
    { target: card, coords: coords(centre(over)) },
  ]);
}

const menuMoves: Play = async ({ canvasElement, userEvent }) => {
  const card = rowNamed(canvasElement, 'Sketch the layout');
  const menu = await openRowMenu(userEvent, card);

  await expect(itemNames(menu)).toEqual(
    sketch.movesTo.map((id) => `Move to ${columnTitle(id)}`),
  );

  await userEvent.click(
    within(menu).getByRole('menuitem', { name: 'Move to In review' }),
  );

  await expect(onMove).toHaveBeenCalledWith({ id: 'c', column: 'review' });
  await waitFor(() =>
    expect(
      within(laneNamed(canvasElement, 'In review')).getByRole('button', {
        name: 'Sketch the layout',
      }),
    ).toBeVisible(),
  );
};

// A card's menu offers a move to each column it names, and none to the others.
export const MenuMovesToANamedColumn = at('wide', menuMoves);

export const MenuMovesToANamedColumnOnAPhone = at('phone', menuMoves);

export const DragLandsOnANamedColumn = at(
  'wide',
  async ({ canvasElement, userEvent }) => {
    const card = rowNamed(canvasElement, 'Sketch the layout');
    const backlog = laneNamed(canvasElement, 'Backlog');

    await hold(userEvent, card, backlog);
    await waitFor(() => expect(backlog).not.toHaveAttribute('aria-disabled'));
    await userEvent.pointer({ target: card, keys: '[/MouseLeft]' });

    await expect(onMove).toHaveBeenCalledWith({ id: 'c', column: 'backlog' });
  },
);

// While a card is held, the columns it cannot land in say so; dropped there, it moves nowhere.
export const DragRefusesAnotherColumn = at(
  'wide',
  async ({ canvasElement, userEvent }) => {
    const card = rowNamed(canvasElement, 'Sketch the layout');
    const done = laneNamed(canvasElement, 'Done');

    await hold(userEvent, card, done);

    await waitFor(() => expect(done).toHaveAttribute('aria-disabled', 'true'));
    await expect(laneNamed(canvasElement, 'In review')).not.toHaveAttribute(
      'aria-disabled',
    );
    await expect(laneNamed(canvasElement, 'In progress')).not.toHaveAttribute(
      'aria-disabled',
    );

    await userEvent.pointer({ target: card, keys: '[/MouseLeft]' });

    await expect(onMove).not.toHaveBeenCalled();
    await waitFor(() => expect(done).not.toHaveAttribute('aria-disabled'));
  },
);

// A phone draws every column at its full width, and the board scrolls sideways to reach them.
export const ColumnsScrollSidewaysOnAPhone = at(
  'phone',
  async ({ canvasElement }) => {
    const lanes = boardColumns.map(({ title }) =>
      laneNamed(canvasElement, title),
    );
    const widths = lanes.map((lane) => lane.getBoundingClientRect().width);
    const board = within(canvasElement).getByLabelText('Tasks');

    await expect(new Set(widths).size).toBe(1);
    await expect(board.scrollWidth).toBeGreaterThan(board.clientWidth);
    await expect(
      lanes.reduce((sum, lane) => sum + lane.getBoundingClientRect().width, 0),
    ).toBeGreaterThan(board.clientWidth);
  },
);

// Each column heads with its title and how many cards it shows.
export const ColumnsCountTheirCards = at('wide', async ({ canvasElement }) => {
  const backlog = laneNamed(canvasElement, 'Backlog');

  await expect(within(backlog).getByText('2')).toBeVisible();
});
