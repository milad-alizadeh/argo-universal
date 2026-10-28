import { createContext, useContext } from 'react';
import type { ListDrag } from './list-drag-controller';
import type { DragLook } from './list-drag-look';
import type { MoveLayout } from './list-drop-aim';
import type { RowFocus } from './list-move-feedback';
import type { ListMove } from './list-move-model';

export interface ListMoves extends MoveLayout {
  look: DragLook;
  drag: ListDrag;
  focus: RowFocus;
  move: (move: ListMove) => void;
}

export const ListMoveContext = createContext<ListMoves | null>(null);

// The moves of the List around a row, when it has `onMove`.
export const useListMoves = (): ListMoves | null => useContext(ListMoveContext);
