import { allToasts, findToast } from '@repo/kit/mocks/find-toast';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { settleLayout, type LayoutName } from '#mocks/story-layout';
import { dismissToasts } from '#primitives/overlays/toast';
import {
  centre,
  coords,
  dragTo,
  itemNames,
  laneNamed,
  openRowMenu,
  rowNamed,
  topOf,
} from './list-move-pointer.mocks';
import { board, boardLanes, column } from './list-moves-fixtures';
import { MovesExample, RefusedMovesExample } from './list-moves.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Moves',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type User = Parameters<NonNullable<Story['play']>>[0]['userEvent'];

// Recorded catalog: the board's first lane holds three cards, the second one, the third none.
const [first, second, third] = boardLanes;

if (
  first?.rows.length !== 3 ||
  second?.rows.length !== 1 ||
  third?.rows.length !== 0
)
  throw new Error('Recorded catalog needs lanes of three, one and no cards.');

const [alpha, , gamma] = first.rows;

const [delta] = second.rows;

if (!alpha || !gamma || !delta)
  throw new Error(
    'Recorded catalog needs a first and third card, and a lone one.',
  );

const moveDown = '{Alt>}{ArrowDown}{/Alt}';

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

export const WideBoardDrawsEachSectionAsALane = boardAt(
  'wide',
  async (canvasElement) => {
    const lane = laneNamed(canvasElement, first.title);

    await expect(
      within(lane)
        .getAllByRole('button')
        .map((row) => row.textContent),
    ).toEqual(first.rows.map((card) => card.title));
  },
);

// The menu moves a row to every other Section, and up or down where it can go.
export const RowMenuListsEveryOtherSection = boardAt(
  'wide',
  async (canvasElement, { user }) => {
    const menu = await openRowMenu(user, rowNamed(canvasElement, alpha.title));

    await expect(itemNames(menu)).toEqual(
      expect.arrayContaining([
        'Move down',
        `Move to ${second.title}`,
        `Move to ${third.title}`,
      ]),
    );
    await expect(itemNames(menu)).not.toContain(`Move to ${first.title}`);
    await expect(itemNames(menu)).not.toContain('Move up');
  },
);

// A Section's only row still moves from its menu, to every other Section.
export const LoneRowMenuStillMoves = boardAt(
  'wide',
  async (canvasElement, { user }) => {
    const menu = await openRowMenu(user, rowNamed(canvasElement, delta.title));

    await expect(itemNames(menu)).toEqual(
      expect.arrayContaining([
        `Move to ${first.title}`,
        `Move to ${third.title}`,
      ]),
    );
  },
);

export const MoveToAnotherLaneFromRowMenu = boardAt(
  'wide',
  async (canvasElement, { user, onMove }) => {
    const menu = await openRowMenu(user, rowNamed(canvasElement, alpha.title));

    await user.click(
      within(menu).getByRole('menuitem', { name: `Move to ${third.title}` }),
    );

    await expect(onMove).toHaveBeenCalledWith({
      id: alpha.id,
      section: third.id,
      index: 0,
    });
    await waitFor(() =>
      expect(
        rowNamed(laneNamed(canvasElement, third.title), alpha.title),
      ).toBeInTheDocument(),
    );
  },
);

export const MoveDownFromKeyboard = boardAt(
  'wide',
  async (canvasElement, { user, onMove }) => {
    rowNamed(canvasElement, alpha.title).focus();
    await user.keyboard(moveDown);

    await expect(onMove).toHaveBeenCalledWith({
      id: alpha.id,
      section: first.id,
      index: 1,
    });
  },
);

// A row moved to another lane from its menu keeps the focus, and a screen reader hears where it landed.
export const MoveKeepsFocusAndIsAnnounced = boardAt(
  'wide',
  async (canvasElement, { user }) => {
    const menu = await openRowMenu(user, rowNamed(canvasElement, alpha.title));

    await user.click(
      within(menu).getByRole('menuitem', { name: `Move to ${third.title}` }),
    );

    await waitFor(() =>
      expect(rowNamed(canvasElement, alpha.title)).toHaveFocus(),
    );
    await expect(
      within(canvasElement).getByText(`Moved to ${third.title}, position 1`),
    ).toBeInTheDocument();
  },
);

// A row moved from the keyboard keeps the focus, and a screen reader hears its new place.
export const KeyboardMoveKeepsFocus = boardAt(
  'wide',
  async (canvasElement, { user }) => {
    rowNamed(canvasElement, alpha.title).focus();
    await user.keyboard(moveDown);

    await waitFor(() =>
      expect(rowNamed(canvasElement, alpha.title)).toHaveFocus(),
    );
    await expect(
      within(canvasElement).getByText(`Moved to ${first.title}, position 2`),
    ).toBeInTheDocument();
  },
);

export const DragToAnotherLane = boardAt(
  'wide',
  async (canvasElement, { user, onMove, onPress }) => {
    const target = laneNamed(canvasElement, third.title);

    await dragTo(user, rowNamed(canvasElement, alpha.title), centre(target));

    await expect(onMove).toHaveBeenCalledWith({
      id: alpha.id,
      section: third.id,
      index: 0,
    });
    await expect(onPress).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(rowNamed(target, alpha.title)).toBeInTheDocument(),
    );
  },
);

export const EscapePutsADraggedRowBack = boardAt(
  'wide',
  async (canvasElement, { user, onMove }) => {
    const row = rowNamed(canvasElement, alpha.title);
    const from = centre(row);
    const to = centre(laneNamed(canvasElement, third.title));

    await user.pointer([
      { target: row, coords: coords(from), keys: '[MouseLeft>]' },
      { target: row, coords: coords({ x: from.x, y: from.y + 12 }) },
      { target: row, coords: coords(to) },
    ]);
    await user.keyboard('{Escape}');
    await user.pointer({ target: row, keys: '[/MouseLeft]' });

    await expect(onMove).not.toHaveBeenCalled();
    await expect(
      rowNamed(laneNamed(canvasElement, first.title), alpha.title),
    ).toBeInTheDocument();
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

// On a phone the board's Sections stack in one column: there are no lanes, and each Section keeps its header.
export const PhoneStacksLanes = boardAt('phone', async (canvasElement) => {
  const canvas = within(canvasElement);

  await expect(canvas.queryByRole('group', { name: first.title })).toBeNull();
  await expect(
    canvas.getAllByRole('heading').map((heading) => heading.textContent),
  ).toEqual(boardLanes.map((lane) => lane.title));
});

// On a phone a row still moves from its menu.
export const PhoneMovesFromRowMenu = boardAt(
  'phone',
  async (canvasElement, { user, onMove }) => {
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

const columnMoves = fn();

export const DragUpAColumn: Story = {
  beforeEach: async () => {
    columnMoves.mockClear();
    await settleLayout('wide');
  },
  render: () => (
    <MovesExample {...column} onMove={columnMoves} onPress={fn()} />
  ),
  play: async ({ canvasElement, userEvent: user }) => {
    const top = topOf(rowNamed(canvasElement, alpha.title));

    await dragTo(user, rowNamed(canvasElement, gamma.title), top);

    await expect(columnMoves).toHaveBeenCalledWith({
      id: gamma.id,
      section: first.id,
      index: 0,
    });
    await expect(
      within(canvasElement).getByText(`Moved to ${first.title}, position 1`),
    ).toBeInTheDocument();
  },
};

const moveRefused = "Couldn't move the row";

// An owner that refuses a move: the row goes back, and the List shows one error toast.
export const RefusedMoveGoesBackWithOneToast: Story = {
  beforeEach: async () => {
    dismissToasts();
    await settleLayout('wide');
  },
  render: () => <RefusedMovesExample />,
  play: async ({ canvasElement, userEvent: user }) => {
    const menu = await openRowMenu(user, rowNamed(canvasElement, alpha.title));

    await user.click(
      within(menu).getByRole('menuitem', { name: `Move to ${third.title}` }),
    );

    await expect(await findToast(moveRefused)).toBeVisible();
    await expect(await allToasts(moveRefused)).toHaveLength(1);
    await waitFor(() =>
      expect(
        rowNamed(laneNamed(canvasElement, first.title), alpha.title),
      ).toBeInTheDocument(),
    );
  },
};
