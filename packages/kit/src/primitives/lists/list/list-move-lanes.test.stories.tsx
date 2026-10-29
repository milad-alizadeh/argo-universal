import type { ListMove } from '@repo/contracts/kit-moves';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import {
  LooseAroundSectionExample,
  LooseOnlyExample,
  SectionWithoutIdExample,
} from './list-move-lanes.mocks';
import {
  moveVia,
  openPicker,
  pickerPlaces,
  untitledSection,
} from './list-move-picker.mocks';
import {
  centre,
  dragTo,
  laneNamed,
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

// The rows outside any Section are a Section of their own, which the picker moves a row to.
export const PickerMovesOutOfASection = wideBoard(
  SectionWithoutIdExample,
  async (canvasElement, { user }) => {
    const picker = await openPicker(user, rowNamed(canvasElement, 'Login'));

    await expect([...pickerPlaces(picker).keys()]).toContain('No Section');
  },
);

// A Section without an id is not a place to move to.
export const PickerLeavesOutASectionWithoutId = wideBoard(
  SectionWithoutIdExample,
  async (canvasElement, { user }) => {
    const picker = await openPicker(user, rowNamed(canvasElement, 'Login'));

    await expect([...pickerPlaces(picker).keys()]).not.toContain('Notes');
  },
);

// A List without Sections still offers Move to…, placing a row among its own rows.
export const PickerWithoutSections = wideBoard(
  LooseOnlyExample,
  async (canvasElement, { user, onMove }) => {
    await moveVia(user, rowNamed(canvasElement, 'Gamma'), [
      untitledSection,
      'Top',
    ]);

    await expect(onMove).toHaveBeenCalledWith({ id: 'gamma', index: 0 });
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
