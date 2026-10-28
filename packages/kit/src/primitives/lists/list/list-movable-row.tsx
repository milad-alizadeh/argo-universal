import {
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import type { ViewInstance } from 'react-native';
import { useLiftedRowMark } from '../../../row-highlights';
import type { ListDrag } from './list-drag-controller';
import type { DragFrame } from './list-drag-frame';
import { useDragFrame } from './list-drag-layer';
import type { DragLook } from './list-drag-look';
import { measureView, useListMoves, type ListMoves } from './list-move-context';
import { placeOf } from './list-move-model';
import { RowDrag } from './list-row-drag';
import { slideOf, Sliding } from './list-sliding';

// The outer view never moves, so the drag measures the row's resting slot.
function useRegisteredRow(
  drag: ListDrag,
  id: string,
): RefObject<ViewInstance | null> {
  const outer = useRef<ViewInstance>(null);

  useEffect(() => drag.registerRow(id, () => measureView(outer)), [drag, id]);

  return outer;
}

const liftedIn = (frame: DragFrame | undefined, id: string): boolean =>
  frame?.id === id;

const liftedClass = (look: DragLook, lifted: boolean): string | undefined =>
  lifted ? look.lifted : undefined;

interface RowPose {
  offset: number;
  className: string | undefined;
}

// Where the row draws while a row is dragged: aside, or dimmed in its own slot while it is the one lifted.
function useRowPose({ drag, look }: ListMoves, id: string): RowPose {
  const frame = useDragFrame(drag);
  const lifted = liftedIn(frame, id);

  useLiftedRowMark(lifted);

  return {
    offset: look.slides ? slideOf(frame?.rowSlides, id) : 0,
    className: liftedClass(look, lifted),
  };
}

interface DraggedRowProps {
  moves: ListMoves;
  id: string;
  ghost: ReactNode;
  children: ReactNode;
}

function DraggedRow({
  moves,
  id,
  ghost,
  children,
}: DraggedRowProps): ReactElement {
  const outer = useRegisteredRow(moves.drag, id);
  const pose = useRowPose(moves, id);

  return (
    <RowDrag drag={moves.drag} id={id} ghost={ghost} viewRef={outer}>
      <Sliding {...pose}>{children}</Sliding>
    </RowDrag>
  );
}

const movableIn = (moves: ListMoves, id: string | undefined): id is string =>
  id !== undefined && placeOf(moves.sections, id) !== undefined;

interface MovableRowProps {
  id: string | undefined;
  ghost: ReactNode;
  children: ReactNode;
}

/*
 * A row of a List with `onMove`, when it is one the List can move: a top-level ListItem with an `id`, in a Section
 * with an id or in none. Any other row draws as it is.
 */
export function MovableRow({
  id,
  ghost,
  children,
}: MovableRowProps): ReactNode {
  const moves = useListMoves();

  if (!moves || !movableIn(moves, id)) return children;

  return (
    <DraggedRow moves={moves} id={id} ghost={ghost}>
      {children}
    </DraggedRow>
  );
}
