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
import type { DragFrame } from './list-drag-frame';
import { useDragFrame } from './list-drag-layer';
import type { DragLook } from './list-drag-look';
import { measureView, useListMoves, type ListMoves } from './list-move-context';
import { placeOf } from './list-move-model';
import { RowDrag } from './list-row-drag';
import { focusView } from './list-row-focus';
import { slideOf, Sliding } from './list-sliding';

// The outer view never moves, so the drag measures the row's resting slot; a move focuses the row it draws.
function useRegisteredRow(
  { drag, focus }: ListMoves,
  id: string,
): RefObject<ViewInstance | null> {
  const outer = useRef<ViewInstance>(null);

  useEffect(() => drag.registerRow(id, () => measureView(outer)), [drag, id]);
  useEffect(() => focus.register(id, () => focusView(outer)), [focus, id]);

  return outer;
}

const liftedIn = (frame: DragFrame | undefined, id: string): boolean =>
  frame?.id === id;

// The row's pointer: grab at rest, grabbing while any row is dragged; and its own slot's look while it is the one lifted.
const poseClass = (
  look: DragLook,
  frame: DragFrame | undefined,
  lifted: boolean,
): string => cn(frame ? look.grabbing : look.grab, lifted && look.lifted);

interface RowPose {
  offset: number;
  className: string;
}

// Where the row draws while a row is dragged: aside, or dimmed in its own slot while it is the one lifted.
function useRowPose({ drag, look }: ListMoves, id: string): RowPose {
  const frame = useDragFrame(drag);
  const lifted = liftedIn(frame, id);

  useLiftedRowMark(lifted);

  return {
    offset: look.slides ? slideOf(frame?.rowSlides, id) : 0,
    className: poseClass(look, frame, lifted),
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
  const outer = useRegisteredRow(moves, id);
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
