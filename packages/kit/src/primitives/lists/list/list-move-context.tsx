import { createContext, useContext, type RefObject } from 'react';
import type { ViewInstance } from 'react-native';
import type { ListDrag } from './list-drag-controller';
import type { DragLook } from './list-drag-look';
import type { Rect } from './list-drop-aim';
import type { ListMove, MoveSection } from './list-move-model';

export interface ListMoves {
  sections: readonly MoveSection[];
  lanes: boolean;
  look: DragLook;
  drag: ListDrag;
  move: (move: ListMove) => void;
}

export const ListMoveContext = createContext<ListMoves | null>(null);

// The moves of the List around a row, when it has `onMove`.
export const useListMoves = (): ListMoves | null => useContext(ListMoveContext);

type Measured = [x: number, y: number, width: number, height: number];

// The drag hit-tests and draws in window coordinates.
export async function measureView(
  view: RefObject<Pick<ViewInstance, 'measureInWindow'> | null>,
): Promise<Rect | undefined> {
  const current = view.current;

  if (!current) return;

  return new Promise((resolve) => {
    current.measureInWindow((...[x, y, width, height]: Measured) =>
      resolve({ x, y, width, height }),
    );
  });
}
