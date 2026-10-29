import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { createRef } from 'react';
import { Text } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { isLegendList, type ListRef } from '../../../list-ref';
import { board, type BoardLane } from './list-moves-fixtures';
import { MovesExample } from './list-moves.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/LanesProps',
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

const onScroll = fn();

const boardTestId = 'sprint-board';

const headerText = 'Sprint board';

const footerText = 'Cards sync every minute';

const boardRef = createRef<ListRef>();

function pagedBoard(play: Story['play']): Story {
  return {
    beforeEach: async () => {
      onLoadMore.mockClear();
      onScroll.mockClear();
      await settleLayout('wide');
    },
    render: () => (
      <MovesExample
        {...board}
        lanes={lanes}
        header={<Text>{headerText}</Text>}
        footer={footerText}
        pagination={{ hasMore: true, onLoadMore }}
        ref={boardRef}
        testID={boardTestId}
        onScroll={onScroll}
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

// The List's ref scrolls the board sideways.
export const TheListsRefScrollsTheBoard = pagedBoard(
  async ({ canvasElement }) => {
    const scroller = within(canvasElement).getByLabelText(
      board.accessibilityLabel,
    );

    const ref = boardRef.current;

    if (!ref || isLegendList(ref)) throw new Error('No board took the ref.');

    ref.scrollTo({ x: 200, animated: false });

    await waitFor(() => expect(scroller.scrollLeft).toBe(200));
  },
);

// The board takes the List's test id.
export const TheBoardTakesTheListsTestId = pagedBoard(
  async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByTestId(boardTestId),
    ).toHaveAccessibleName(board.accessibilityLabel);
  },
);

// The List's own onScroll hears the board scroll sideways.
export const TheListsOnScrollHearsTheBoard = pagedBoard(
  async ({ canvasElement }) => {
    const scroller = within(canvasElement).getByTestId(boardTestId);

    scroller.scrollLeft = 200;
    scroller.dispatchEvent(new Event('scroll'));

    await waitFor(() => expect(onScroll).toHaveBeenCalled());
  },
);
