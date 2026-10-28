import type { LegendListRef } from '@legendapp/list/react-native';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { View, type ViewInstance } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { cn } from '../../../utils';
import { useColumnScroll } from './list-column-scroll';
import { ListDrag } from './list-drag-controller';
import { ListDragLayer, useDragFrame } from './list-drag-layer';
import { dragLook } from './list-drag-look';
import type { Point } from './list-drop-aim';
import { MoveAnnouncer } from './list-move-announcer';
import {
  ListMoveContext,
  measureView,
  type ListMoves,
} from './list-move-context';
import { useMoveFeedback, type MoveFeedback } from './list-move-feedback';
import type { MoveNotice } from './list-move-notice';
import { useShownMoves, type MoveAnswer } from './list-shown-moves';

interface GhostPoint {
  x: SharedValue<number>;
  y: SharedValue<number>;
}

const ghostMover =
  ({ x, y }: GhostPoint) =>
  (point: Point): void => {
    x.set(point.x);
    y.set(point.y);
  };

function useListDrag(
  layer: RefObject<ViewInstance | null>,
  ghost: GhostPoint,
): ListDrag {
  const [drag] = useState(
    () => new ListDrag(() => measureView(layer), ghostMover(ghost)),
  );

  useEffect((): (() => void) => () => drag.cancel(), [drag]);

  return drag;
}

function useConfiguredMoves(
  drag: ListDrag,
  { shown: { sections, move }, focus }: MoveFeedback,
  lanes: boolean,
): ListMoves {
  useEffect(
    () => drag.configure({ sections, lanes, move }),
    [drag, sections, lanes, move],
  );

  return useMemo(
    () => ({ sections, lanes, look: dragLook, drag, focus, move }),
    [sections, lanes, drag, focus, move],
  );
}

interface MovableListProps {
  onMove: MoveAnswer;
  lanes: boolean;
  children: ReactNode;
  // The List's own ref, kept on its scroll view.
  listRef: Ref<LegendListRef> | undefined;
  // Draws the List's rows, in the order they show, on a scroll view taking `ref`.
  render: (children: ReactNode, ref: Ref<LegendListRef>) => ReactElement;
}

interface MoveHost {
  moves: ListMoves;
  children: ReactNode;
  layer: RefObject<ViewInstance | null>;
  ghost: GhostPoint;
  scrollTo: Ref<LegendListRef>;
  notice: MoveNotice | null;
}

function useMoveHost({ lanes, ...props }: MovableListProps): MoveHost {
  const shown = useShownMoves(props.children, props.onMove);
  const feedback = useMoveFeedback(shown);
  const layer = useRef<ViewInstance>(null);
  const ghost = { x: useSharedValue(0), y: useSharedValue(0) };
  const drag = useListDrag(layer, ghost);
  const own = props.listRef;
  const scrollTo = useColumnScroll({ drag, frame: layer, own, lanes });
  const moves = useConfiguredMoves(drag, feedback, lanes);
  const { notice } = feedback;

  return { moves, children: shown.children, layer, ghost, scrollTo, notice };
}

interface SurfaceProps {
  drag: ListDrag;
  viewRef: RefObject<ViewInstance | null>;
  children: ReactNode;
}

// The List's frame and the drag layer's coordinates; the pointer grabs over all of it while a row is dragged.
function DragSurface({ drag, viewRef, children }: SurfaceProps): ReactElement {
  const dragging = useDragFrame(drag) !== undefined;
  const className = cn('min-h-0 shrink grow', dragging && dragLook.grabbing);

  return (
    <View ref={viewRef} collapsable={false} className={className}>
      {children}
    </View>
  );
}

/*
 * A List with `onMove`: its rows move from their context menus, and by dragging. The drag layer sits over the rows,
 * holding the lifted row and the line where it lands; it draws outside the moves, so the lifted copy is a plain row.
 * After a move, focus stays on the moved row and a screen reader hears where it landed.
 */
export function MovableList(props: MovableListProps): ReactElement {
  const { moves, children, layer, ghost, ...host } = useMoveHost(props);

  return (
    <DragSurface drag={moves.drag} viewRef={layer}>
      <ListMoveContext value={moves}>
        {props.render(children, host.scrollTo)}
      </ListMoveContext>
      <ListDragLayer drag={moves.drag} look={dragLook} {...ghost} />
      <MoveAnnouncer notice={host.notice} />
    </DragSurface>
  );
}
