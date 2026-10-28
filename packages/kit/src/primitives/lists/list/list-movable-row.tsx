import {
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import type { ViewInstance } from 'react-native';
import { useLiftedRowMark } from '../../../row-highlights';
import { cn } from '../../../utils';
import { useDragValue } from './list-drag-layer';
import { measureView } from './list-geometry';
import { useListMoves, type ListMoves } from './list-move-context';
import type { RowId } from './list-move-model';
import { slideOf, Sliding } from './list-move-zone';
import { RowDrag } from './list-row-drag';
import { focusView } from './list-row-focus';

// The outer view never moves, so the drag measures the row's resting slot; a move focuses the row it draws.
function useRegisteredRow(
  { drag, order }: ListMoves,
  id: RowId,
): RefObject<ViewInstance | null> {
  const outer = useRef<ViewInstance>(null);

  useEffect(
    () => drag.registry.registerRow(id, () => measureView(outer)),
    [drag, id],
  );
  useEffect(
    () => order.registerFocus(id, (ifLost) => focusView(outer, ifLost)),
    [order, id],
  );

  return outer;
}

interface RowPose {
  offset: number;
  className: string;
}

/*
 * Where the row draws while a row is dragged: aside, or dimmed in its own slot while it is the one lifted. Its pointer
 * grabs at rest, and shows grabbing while any row is dragged.
 */
function useRowPose({ drag, look }: ListMoves, id: RowId): RowPose {
  const offset = useDragValue(drag, (frame) => slideOf(frame?.rowSlides, id));
  const lifted = useDragValue(drag, (frame) => frame?.id === id);
  const dragging = useDragValue(drag, (frame) => frame !== undefined);

  useLiftedRowMark(lifted);

  return {
    offset,
    className: cn(dragging ? look.grabbing : look.grab, lifted && look.lifted),
  };
}

interface DraggedRowProps {
  moves: ListMoves;
  id: RowId;
  ghost: ReactNode;
  children: ReactNode;
}

function DraggedRow({
  moves,
  id,
  ghost,
  children,
}: DraggedRowProps): ReactElement {
  const outer = useRegisteredRow(moves, id);
  const pose = useRowPose(moves, id);

  return (
    <RowDrag drag={moves.drag} id={id} ghost={ghost} viewRef={outer}>
      <Sliding {...pose}>{children}</Sliding>
    </RowDrag>
  );
}

interface MovableRowProps {
  id: RowId | undefined;
  ghost: ReactNode;
  children: ReactNode;
}

/*
 * A row of a List with `onMove`, when it is one the List can move: a top-level ListItem with an `id`, in a Section
 * with an id or in none, which is a row the List's reading gives a move `id`. Any other row draws as it is.
 */
export function MovableRow({
  id,
  ghost,
  children,
}: MovableRowProps): ReactNode {
  const moves = useListMoves();

  if (!moves || id === undefined) return children;

  return (
    <DraggedRow moves={moves} id={id} ghost={ghost}>
      {children}
    </DraggedRow>
  );
}
