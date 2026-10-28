import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { board, type BoardLane } from './list-moves-fixtures';
import { MovesExample } from './list-moves.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Lanes Props',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// More lanes than a wide window holds, so the board scrolls sideways.
const lanes: readonly BoardLane[] = Array.from({ length: 8 }, (_, lane) => ({
  id: `lane-${lane}`,
  title: `Lane ${lane + 1}`,
  rows: [{ id: `card-${lane}`, title: `Card ${lane + 1}` }],
}));

const onLoadMore = fn((): Promise<void> => Promise.resolve());

const headerText = 'Sprint board';

const footerText = 'Cards sync every minute';

function pagedBoard(play: Story['play']): Story {
  return {
    beforeEach: async () => {
      onLoadMore.mockClear();
      await settleLayout('wide');
    },
    render: () => (
      <MovesExample
        {...board}
        lanes={lanes}
        header={<Text>{headerText}</Text>}
        footer={footerText}
        pagination={{ hasMore: true, onLoadMore }}
      />
    ),
    play,
  };
}

// The board keeps the List's name, header and footer.
export const LanesKeepTheListsNameHeaderAndFooter = pagedBoard(
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByLabelText(board.accessibilityLabel)).toBeVisible();
    await expect(canvas.getByText(headerText)).toBeVisible();
    await expect(canvas.getByText(footerText)).toBeVisible();
  },
);

// Scrolling the board to its last lane loads the next page, as a List's end does.
export const ScrollingTheBoardToItsEndLoadsMore = pagedBoard(
  async ({ canvasElement }) => {
    const scroller = within(canvasElement).getByLabelText(
      board.accessibilityLabel,
    );

    await expect(onLoadMore).not.toHaveBeenCalled();

    scroller.scrollLeft = scroller.scrollWidth;
    scroller.dispatchEvent(new Event('scroll'));

    await waitFor(() => expect(onLoadMore).toHaveBeenCalledOnce());
  },
);
