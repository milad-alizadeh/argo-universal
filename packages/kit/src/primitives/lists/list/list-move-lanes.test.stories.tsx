import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import {
  LooseAroundSectionExample,
  LooseOnlyExample,
  SectionWithoutIdExample,
} from './list-move-lanes.mocks';
import type { ListMove } from './list-move-model';
import {
  centre,
  dragTo,
  itemNames,
  laneNamed,
  openRowMenu,
  rowNamed,
  topOf,
} from './list-move-pointer.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/MoveLanes',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Example = (props: { onMove: (move: ListMove) => void }) => ReactElement;

type Play = NonNullable<Story['play']>;

type Check = (
  canvasElement: HTMLElement,
  spies: {
    user: Parameters<Play>[0]['userEvent'];
    onMove: ReturnType<typeof fn>;
  },
) => Promise<void>;

// A wide board, so its Sections draw as lanes.
function wideBoard(Drawn: Example, check: Check): Story {
  const onMove = fn();

  return {
    beforeEach: async () => {
      onMove.mockClear();
      await settleLayout('wide');
    },
    render: () => <Drawn onMove={onMove} />,
    play: ({ canvasElement, userEvent }) =>
      check(canvasElement, { user: userEvent, onMove }),
  };
}

// A Section without an id takes no drops: a row dragged over it goes to the nearest lane that does, here back home.
export const NothingLandsInASectionWithoutId = wideBoard(
  SectionWithoutIdExample,
  async (canvasElement, { user, onMove }) => {
    const notes = laneNamed(canvasElement, 'Notes');

    await dragTo(user, rowNamed(canvasElement, 'Login'), centre(notes));

    await expect(onMove).not.toHaveBeenCalled();
    await expect(
      rowNamed(laneNamed(canvasElement, 'To do'), 'Login'),
    ).toBeInTheDocument();
  },
);

// The rows outside any Section are a Section of their own, which a row's menu moves to; a Section without an id is not.
export const MenuMovesOutOfASection = wideBoard(
  SectionWithoutIdExample,
  async (canvasElement, { user }) => {
    const menu = await openRowMenu(user, rowNamed(canvasElement, 'Login'));

    await expect(itemNames(menu)).toContain('Move out of Section');
    await expect(itemNames(menu)).not.toContain('Move to Notes');
  },
);

// Rows outside any Section on both sides of one form one lane, so a row dropped among them lands there.
export const LooseRowsAroundASectionAreOneLane = wideBoard(
  LooseAroundSectionExample,
  async (canvasElement, { user, onMove }) => {
    const alpha = rowNamed(canvasElement, 'Alpha');

    await dragTo(user, rowNamed(canvasElement, 'Login'), topOf(alpha));

    await expect(onMove).toHaveBeenCalledWith({ id: 'login', index: 0 });
  },
);

// A board without Sections draws one column on a wide window, and a row dragged there lands.
export const BoardWithoutSectionsStillLandsADrop = wideBoard(
  LooseOnlyExample,
  async (canvasElement, { user, onMove }) => {
    const alpha = rowNamed(canvasElement, 'Alpha');

    await dragTo(user, rowNamed(canvasElement, 'Gamma'), topOf(alpha));

    await expect(onMove).toHaveBeenCalledWith({ id: 'gamma', index: 0 });
  },
);
