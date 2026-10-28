import type { LegendListRef } from '@legendapp/list/react-native';
import type { ListMove } from '@repo/contracts/kit-moves';
import {
  useEffect,
  useLayoutEffect,
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
import { ListDragLayer, useDragValue } from './list-drag-layer';
import { dragLook } from './list-drag-look';
import type { MoveLayout } from './list-drop-aim';
import { measureView, type Point } from './list-geometry';
import { MoveAnnouncer } from './list-move-announcer';
import { ListMoveContext, type ListMoves } from './list-move-context';
import {
  useMoveFeedback,
  type MoveFeedback,
  type MoveNotice,
} from './list-move-feedback';
import type { MoveSection } from './list-move-model';
import { MoveOrder } from './list-move-order';

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
  { order, lanes }: Pick<ListMoves, 'order' | 'lanes'>,
  { move, focus }: MoveFeedback,
): ListMoves {
  useEffect(
    () => drag.configure({ order, lanes, slides: dragLook.slides, move }),
    [drag, order, lanes, move],
  );

  return useMemo(
    () => ({ look: dragLook, drag, focus, move, order, lanes }),
    [drag, focus, move, order, lanes],
  );
}

// The order the List shows, as a store its rows read; it changes before the List paints.
function useShownOrder(sections: readonly MoveSection[]): MoveOrder {
  const [order] = useState(() => new MoveOrder(sections));

  useLayoutEffect(() => order.show(sections), [order, sections]);

  return order;
}

interface MovableListProps {
  layout: MoveLayout;
  move: (move: ListMove) => void;
  // The List's own ref, kept on its scroll view.
  listRef: Ref<LegendListRef> | undefined;
  // Draws the List's rows, in the order they show, on a scroll view taking `ref`.
  render: (ref: Ref<LegendListRef>) => ReactElement;
}

interface MoveHost {
  moves: ListMoves;
  layer: RefObject<ViewInstance | null>;
  ghost: GhostPoint;
  scrollTo: Ref<LegendListRef>;
  notice: MoveNotice | null;
}

function useMoveHost({ layout, move, listRef }: MovableListProps): MoveHost {
  const { sections, lanes } = layout;
  const order = useShownOrder(sections);
  const feedback = useMoveFeedback(order, move);
  const layer = useRef<ViewInstance>(null);
  const ghost = { x: useSharedValue(0), y: useSharedValue(0) };
  const drag = useListDrag(layer, ghost);
  const scrollTo = useColumnScroll({ drag, frame: layer, own: listRef, lanes });
  const moves = useConfiguredMoves(drag, { order, lanes }, feedback);

  return { moves, layer, ghost, scrollTo, notice: feedback.notice };
}

interface SurfaceProps {
  drag: ListDrag;
  viewRef: RefObject<ViewInstance | null>;
  children: ReactNode;
}

// The List's frame and the drag layer's coordinates; the pointer grabs over all of it while a row is dragged.
function DragSurface({ drag, viewRef, children }: SurfaceProps): ReactElement {
  const dragging = useDragValue(drag, (frame) => frame !== undefined);
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
  const { moves, layer, ghost, ...host } = useMoveHost(props);

  return (
    <DragSurface drag={moves.drag} viewRef={layer}>
      <ListMoveContext value={moves}>
        {props.render(host.scrollTo)}
      </ListMoveContext>
      <ListDragLayer drag={moves.drag} look={dragLook} {...ghost} />
      <MoveAnnouncer notice={host.notice} />
    </DragSurface>
  );
}
