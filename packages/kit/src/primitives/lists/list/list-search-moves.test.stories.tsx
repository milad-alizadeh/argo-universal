import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { rowNamed } from './list-move-pointer.mocks';
import { column, type BoardLane } from './list-moves-fixtures';
import { MovesExample } from './list-moves.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Search Moves',
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

// Moving the first row shown below the last one lands it at the true end of its Section, past the hidden row.
export const MoveWhileSearchingCountsHiddenRows: Story = {
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

    rowNamed(canvasElement, 'Alpha').focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');

    await expect(onMove).toHaveBeenCalledWith({
      id: 'alpha',
      section: 'first',
      index: 2,
    });
  },
};
