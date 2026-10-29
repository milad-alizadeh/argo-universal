import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { moveVia } from './list-move-picker.mocks';
import { rowNamed, type User } from './list-move-pointer.mocks';
import { column, type BoardLane } from './list-moves-fixtures';
import { MovesExample } from './list-moves.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/SearchMoves',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// A search for "al" shows Alpha and Alps, and hides Beta between them.
const lanes: readonly BoardLane[] = [
  {
    id: 'first',
    title: 'First',
    rows: [
      { id: 'alpha', title: 'Alpha' },
      { id: 'beta', title: 'Beta' },
      { id: 'alps', title: 'Alps' },
    ],
  },
];

const onMove = fn();

const onPress = fn();

const searched = (
  play: (canvasElement: HTMLElement, user: User) => Promise<void>,
): Story => ({
  beforeEach: async () => {
    onMove.mockClear();
    await settleLayout('wide');
  },
  render: () => (
    <MovesExample
      {...column}
      lanes={lanes}
      searchMode="app"
      onMove={onMove}
      onPress={onPress}
    />
  ),
  play: async ({ canvasElement, userEvent }) => {
    await userEvent.type(within(canvasElement).getByLabelText('Search'), 'al');
    await waitFor(() =>
      expect(within(canvasElement).queryByText('Beta')).toBeNull(),
    );
    await play(canvasElement, userEvent);
  },
});

// Moving the first row shown below the last one lands it at the true end of its Section, past the hidden row.
export const MoveWhileSearchingCountsHiddenRows = searched(
  async (canvasElement, user) => {
    rowNamed(canvasElement, 'Alpha').focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');

    await expect(onMove).toHaveBeenCalledWith({
      id: 'alpha',
      section: 'first',
      index: 2,
    });
  },
);

// The picker lists only the rows the search shows, and places a row among them.
export const PickerWhileSearchingPlacesAmongShownRows = searched(
  async (canvasElement, user) => {
    await moveVia(user, rowNamed(canvasElement, 'Alps'), ['First', 'Top']);

    await expect(onMove).toHaveBeenCalledWith({
      id: 'alps',
      section: 'first',
      index: 0,
    });
  },
);
