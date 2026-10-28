import type { ListMove } from '@repo/contracts/kit-moves';
import { createContext, useContext } from 'react';
import type { ListDrag } from './list-drag-controller';
import type { DragLook } from './list-drag-look';
import type { RowFocus } from './list-move-feedback';
import type { MoveOrder } from './list-move-order';

// What every row, zone and lane of a List with `onMove` shares; a move changes none of it, only what `order` holds.
export interface ListMoves {
  look: DragLook;
  drag: ListDrag;
  focus: RowFocus;
  move: (move: ListMove) => void;
  order: MoveOrder;
  // The List's Sections draw as lanes side by side.
  lanes: boolean;
}

export const ListMoveContext = createContext<ListMoves | null>(null);

export const useListMoves = (): ListMoves | null => useContext(ListMoveContext);
