import type { MoveLayout } from './list-drop-aim';
import type { ListMove } from './list-move-model';
import type { MoveOrder } from './list-move-order';

// What a List's drag works on: the order the List shows, read as the drag aims and drops, and how a drop moves.
export interface DragSetup {
  order: Pick<MoveOrder, 'sections'>;
  lanes: boolean;
  move: (move: ListMove) => void;
}

// Before its List configures it, a drag has nowhere to land.
export const idleSetup: DragSetup = {
  order: { sections: [] },
  lanes: false,
  move: () => {},
};

export const layoutOf = ({ order, lanes }: DragSetup): MoveLayout => ({
  sections: order.sections,
  lanes,
});
