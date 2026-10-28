import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { settleLayout, type LayoutName } from '#mocks/story-layout';
import { board, boardLanes, column } from './list-moves-fixtures';
import { MovesExample } from './list-moves.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Moves',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// The story's own user: one pointer, so a press in one call is released by the next.
type User = Parameters<NonNullable<Story['play']>>[0]['userEvent'];

// Recorded catalog: the board's first lane holds three cards, the second one, the third none.
const [first, second, third] = boardLanes;

if (
  first?.cards.length !== 3 ||
  second?.cards.length !== 1 ||
  third?.cards.length !== 0
)
  throw new Error('Recorded catalog needs lanes of three, one and no cards.');

const [alpha, , gamma] = first.cards;

if (!alpha || !gamma)
  throw new Error('Recorded catalog needs a first and third card.');

const insertionLine = 'list-insertion-line';

const press = '[MouseLeft>]';

const release = '[/MouseLeft]';

interface Point {
  x: number;
  y: number;
}

const centre = (element: Element): Point => {
  const box = element.getBoundingClientRect();

  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

const coords = ({
  x,
  y,
}: Point): Pick<MouseEventInit, 'clientX' | 'clientY'> => ({
  clientX: x,
  clientY: y,
});

const rowNamed = (canvasElement: HTMLElement, title: string): HTMLElement =>
  within(canvasElement).getByRole('button', { name: title });

async function openRowMenu(user: User, row: HTMLElement): Promise<HTMLElement> {
  await user.pointer({ target: row, keys: '[MouseRight]' });

  return within(row.ownerDocument.body).findByRole('menu');
}

// Takes a row, drags it past the mouse's slop, and holds it over `to`; the List draws the drag before the release.
async function dragOver(
  user: User,
  row: HTMLElement,
  to: Point,
): Promise<void> {
  const from = centre(row);

  await user.pointer([
    { target: row, coords: coords(from), keys: press },
    { target: row, coords: coords({ x: from.x, y: from.y + 12 }) },
  ]);
  // The lifted copy draws beside the row it was taken from.
  await waitFor(() =>
    expect(
      within(row.ownerDocument.body).getAllByText(row.textContent ?? ''),
    ).toHaveLength(2),
  );
  await user.pointer({ target: row, coords: coords(to) });
}

async function drop(user: User, row: HTMLElement): Promise<void> {
  await user.pointer({ target: row, keys: release });
}

interface Spies {
  user: User;
  onMove: ReturnType<typeof fn>;
  onPress: ReturnType<typeof fn>;
}

function boardAt(
  layout: LayoutName,
  play: (canvasElement: HTMLElement, spies: Spies) => Promise<void>,
): Story {
  const onMove = fn();
  const onPress = fn();

  return {
    beforeEach: async () => {
      onMove.mockClear();
      onPress.mockClear();
      await settleLayout(layout);
    },
    render: () => <MovesExample {...board} onMove={onMove} onPress={onPress} />,
    play: ({ canvasElement, userEvent }) =>
      play(canvasElement, { user: userEvent, onMove, onPress }),
  };
}

export const MoveToAnotherLaneFromRowMenu = boardAt(
  'wide',
  async (canvasElement, { user, onMove }) => {
    const menu = await openRowMenu(user, rowNamed(canvasElement, alpha.title));

    await expect(
      within(menu).queryByRole('menuitem', { name: `Move to ${first.title}` }),
    ).toBeNull();
    await expect(
      within(menu).queryByRole('menuitem', { name: 'Move up' }),
    ).toBeNull();
    await user.click(
      within(menu).getByRole('menuitem', { name: `Move to ${third.title}` }),
    );

    await expect(onMove).toHaveBeenCalledWith({
      id: alpha.id,
      section: third.id,
      index: 0,
    });

    const moved = await openRowMenu(user, rowNamed(canvasElement, alpha.title));

    // The menu fades in, so its items show once it has opened.
    await waitFor(() =>
      expect(
        within(moved).getByRole('menuitem', { name: `Move to ${first.title}` }),
      ).toBeVisible(),
    );
    await expect(
      within(moved).queryByRole('menuitem', { name: `Move to ${third.title}` }),
    ).toBeNull();
  },
);

export const MoveDownFromKeyboard = boardAt(
  'wide',
  async (canvasElement, { user, onMove }) => {
    rowNamed(canvasElement, alpha.title).focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');

    await expect(onMove).toHaveBeenCalledWith({
      id: alpha.id,
      section: first.id,
      index: 1,
    });
  },
);

export const DragToAnotherLane = boardAt(
  'wide',
  async (canvasElement, { user, onMove, onPress }) => {
    const row = rowNamed(canvasElement, alpha.title);
    const target = within(canvasElement).getByText(third.title);

    await dragOver(user, row, centre(target));
    await waitFor(() =>
      expect(within(canvasElement).getByTestId(insertionLine)).toBeVisible(),
    );
    await drop(user, row);

    await expect(onMove).toHaveBeenCalledWith({
      id: alpha.id,
      section: third.id,
      index: 0,
    });
    await expect(onPress).not.toHaveBeenCalled();
    await expect(within(canvasElement).queryByTestId(insertionLine)).toBeNull();
  },
);

export const EscapePutsADraggedRowBack = boardAt(
  'wide',
  async (canvasElement, { user, onMove }) => {
    const row = rowNamed(canvasElement, alpha.title);

    await dragOver(
      user,
      row,
      centre(within(canvasElement).getByText(third.title)),
    );
    await within(canvasElement).findByTestId(insertionLine);
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(within(canvasElement).queryByTestId(insertionLine)).toBeNull(),
    );
    await drop(user, row);

    await expect(onMove).not.toHaveBeenCalled();
  },
);

export const PressWithoutDragging = boardAt(
  'wide',
  async (canvasElement, { user, onMove, onPress }) => {
    await user.click(rowNamed(canvasElement, alpha.title));

    await expect(onPress).toHaveBeenCalledOnce();
    await expect(onMove).not.toHaveBeenCalled();
  },
);

// On a phone the board's lanes stack as Sections, one below another, and its rows still move from their menus.
export const PhoneStacksLanes = boardAt(
  'phone',
  async (canvasElement, { user, onMove }) => {
    const canvas = within(canvasElement);
    const firstHeader = canvas.getByText(first.title).getBoundingClientRect();
    const secondHeader = canvas.getByText(second.title).getBoundingClientRect();

    const lastOfFirst = canvas
      .getByRole('button', { name: gamma.title })
      .getBoundingClientRect();

    await expect(secondHeader.top).toBeGreaterThan(lastOfFirst.top);
    await expect(secondHeader.left).toBe(firstHeader.left);

    const menu = await openRowMenu(user, rowNamed(canvasElement, gamma.title));

    await user.click(
      within(menu).getByRole('menuitem', { name: `Move to ${second.title}` }),
    );
    await expect(onMove).toHaveBeenCalledWith({
      id: gamma.id,
      section: second.id,
      index: 1,
    });
  },
);

export const WideBoardDrawsLanesSideBySide = boardAt(
  'wide',
  async (canvasElement) => {
    const canvas = within(canvasElement);
    const firstHeader = canvas.getByText(first.title).getBoundingClientRect();
    const secondHeader = canvas.getByText(second.title).getBoundingClientRect();

    await expect(secondHeader.left).toBeGreaterThan(firstHeader.right);
    await expect(secondHeader.top).toBe(firstHeader.top);
  },
);

const columnMoves = fn();

export const DragUpAColumn: Story = {
  beforeEach: async () => {
    await settleLayout('wide');
  },
  render: () => (
    <MovesExample {...column} onMove={columnMoves} onPress={fn()} />
  ),
  play: async ({ canvasElement, userEvent: user }) => {
    columnMoves.mockClear();
    const row = rowNamed(canvasElement, gamma.title);
    const top = rowNamed(canvasElement, alpha.title).getBoundingClientRect();

    await dragOver(user, row, { x: top.left + 20, y: top.top + 4 });
    await within(canvasElement).findByTestId(insertionLine);
    await drop(user, row);

    await expect(columnMoves).toHaveBeenCalledWith({
      id: gamma.id,
      section: first.id,
      index: 0,
    });
  },
};
