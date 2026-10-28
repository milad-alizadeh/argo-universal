import type { ListMove } from '@repo/contracts/kit-moves';
import type { DragFrame, FrameInput } from './list-drag-frame';
import type { MoveLayout } from './list-drop-aim';
import { landing } from './list-move-model';
import type { MoveOrder } from './list-move-order';

// What a List's drag works on: the order the List shows, read as the drag aims and drops, and how a drop moves.
export interface DragSetup {
  order: Pick<MoveOrder, 'sections'>;
  lanes: boolean;
  // The rows beside the lifted one slide apart, so a frame says how far.
  slides: boolean;
  move: (move: ListMove) => void;
}

// Before its List configures it, a drag has nowhere to land.
export const idleSetup: DragSetup = {
  order: { sections: [] },
  lanes: false,
  slides: false,
  move: () => {},
};

const layoutOf = ({ order, lanes }: DragSetup): MoveLayout => ({
  sections: order.sections,
  lanes,
});

// What a drag frame reads from the setup.
export const frameSetup = (
  setup: DragSetup,
): Pick<FrameInput, 'layout' | 'slides'> => ({
  layout: layoutOf(setup),
  slides: setup.slides,
});

// The move a drop reports where the lifted row aims, by the order the List shows.
export const landedMove = (
  setup: DragSetup,
  frame: DragFrame | undefined,
): ListMove | undefined =>
  frame?.place
    ? landing(setup.order.sections, frame.id, frame.place)
    : undefined;
