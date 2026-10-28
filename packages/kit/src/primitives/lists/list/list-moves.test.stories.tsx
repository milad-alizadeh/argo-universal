import { allToasts, findToast } from '@repo/kit/mocks/find-toast';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { settleLayout, type LayoutName } from '#mocks/story-layout';
import { dismissToasts } from '#primitives/overlays/toast';
import { moveVia, pickerPlaces, openPicker } from './list-move-picker.mocks';
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

// The menu moves a row up or down where it can go, and to any place from Move to….
export const RowMenuOffersStepsAndMoveTo = boardAt(
  'wide',
  async (canvasElement, { user }) => {
    const menu = await openRowMenu(user, rowNamed(canvasElement, alpha.title));

    await expect(itemNames(menu)).toEqual(['Move down', 'Move to…']);
  },
);

// A Section's only row has no step to make, but its menu still moves it.
export const LoneRowMenuStillMoves = boardAt(
  'wide',
  async (canvasElement, { user }) => {
    const menu = await openRowMenu(user, rowNamed(canvasElement, delta.title));

    await expect(itemNames(menu)).toContain('Move to…');
  },
);

// The picker lists every Section the row can move to, its own included.
export const PickerListsEverySection = boardAt(
  'wide',
  async (canvasElement, { user }) => {
    const picker = await openPicker(user, rowNamed(canvasElement, alpha.title));

    await expect([...pickerPlaces(picker).keys()]).toEqual(
      boardLanes.map((lane) => lane.title),
    );
  },
);

// An empty Section offers only its top.
export const PickerOffersTheTopOfAnEmptySection = boardAt(
  'wide',
  async (canvasElement, { user }) => {
    const picker = await openPicker(user, rowNamed(canvasElement, alpha.title));

    await expect(pickerPlaces(picker).get(third.title)).toEqual(['Top']);
  },
);

export const MoveToAnotherLaneFromPicker = boardAt(
  'wide',
  async (canvasElement, { user, onMove }) => {
    await moveVia(user, rowNamed(canvasElement, alpha.title), [
      third.title,
      'Top',
    ]);

    await expect(onMove).toHaveBeenCalledWith({
      id: alpha.id,
      section: third.id,
      index: 0,
    });
  },
);

export const PickedMoveShowsInItsLane = boardAt(
  'wide',
  async (canvasElement, { user }) => {
    await moveVia(user, rowNamed(canvasElement, alpha.title), [
      third.title,
      'Top',
    ]);

    await waitFor(() =>
      expect(
        rowNamed(laneNamed(canvasElement, third.title), alpha.title),
      ).toBeInTheDocument(),
    );
  },
);

// The picker places a row after a chosen row.
export const MoveAfterARowFromPicker = boardAt(
  'wide',
  async (canvasElement, { user, onMove }) => {
    await moveVia(user, rowNamed(canvasElement, delta.title), [
      first.title,
      `After ${alpha.title}`,
    ]);

    await expect(onMove).toHaveBeenCalledWith({
      id: delta.id,
      section: first.id,
      index: 1,
    });
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

// Every row declares the same Alt+↑/↓: the focused row's declaration answers, not the first row's.
export const KeyboardMovesTheFocusedRow = boardAt(
  'wide',
  async (canvasElement, { user, onMove }) => {
    rowNamed(canvasElement, gamma.title).focus();
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

    await expect(onMove.mock.calls).toEqual([
      [{ id: gamma.id, section: first.id, index: 1 }],
    ]);
  },
);

// A row moved to another lane from its menu keeps the focus.
export const PickedMoveKeepsFocus = boardAt(
  'wide',
  async (canvasElement, { user }) => {
    await moveVia(user, rowNamed(canvasElement, alpha.title), [
      third.title,
      'Top',
    ]);

    await waitFor(() =>
      expect(rowNamed(canvasElement, alpha.title)).toHaveFocus(),
    );
  },
);

// A screen reader hears the Section a picked move lands in.
export const PickedMoveIsAnnounced = boardAt(
  'wide',
  async (canvasElement, { user }) => {
    await moveVia(user, rowNamed(canvasElement, alpha.title), [
      third.title,
      'Top',
    ]);

    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      third.title,
    );
  },
);

// A row moved from the keyboard keeps the focus.
export const KeyboardMoveKeepsFocus = boardAt(
  'wide',
  async (canvasElement, { user }) => {
    rowNamed(canvasElement, alpha.title).focus();
    await user.keyboard(moveDown);

    await waitFor(() =>
      expect(rowNamed(canvasElement, alpha.title)).toHaveFocus(),
    );
  },
);

// A screen reader hears the Section a keyboard move lands in.
export const KeyboardMoveIsAnnounced = boardAt(
  'wide',
  async (canvasElement, { user }) => {
    rowNamed(canvasElement, alpha.title).focus();
    await user.keyboard(moveDown);

    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      first.title,
    );
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

// On a phone a row still moves from its menu's picker.
export const PhoneMovesFromPicker = boardAt(
  'phone',
  async (canvasElement, { user, onMove }) => {
    await moveVia(user, rowNamed(canvasElement, gamma.title), [
      second.title,
      'End',
    ]);

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
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      first.title,
    );
  },
};

const moveRefused = "Couldn't move the row";

const refused = (
  play: (canvasElement: HTMLElement) => Promise<void>,
): Story => ({
  beforeEach: async () => {
    dismissToasts();
    await settleLayout('wide');
  },
  render: () => <RefusedMovesExample />,
  play: async ({ canvasElement, userEvent: user }) => {
    await moveVia(user, rowNamed(canvasElement, alpha.title), [
      third.title,
      'Top',
    ]);
    await play(canvasElement);
  },
});

// An owner that refuses a move: the List shows one error toast.
export const RefusedMoveShowsOneToast = refused(async () => {
  await expect(await findToast(moveRefused)).toBeVisible();
  await expect(await allToasts(moveRefused)).toHaveLength(1);
});

// An owner that refuses a move: the row goes back.
export const RefusedMoveGoesBack = refused(async (canvasElement) => {
  await waitFor(() =>
    expect(
      rowNamed(laneNamed(canvasElement, first.title), alpha.title),
    ).toBeInTheDocument(),
  );
});
