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
import { useColumnScroll } from './list-column-scroll';
import { ListDrag } from './list-drag-controller';
import { ListDragLayer } from './list-drag-layer';
import { dragLook } from './list-drag-look';
import type { Point } from './list-drop-aim';
import {
  ListMoveContext,
  measureView,
  type ListMoves,
} from './list-move-context';
import {
  useShownMoves,
  type MoveAnswer,
  type ShownMoves,
} from './list-shown-moves';

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
  { sections, move }: ShownMoves,
  lanes: boolean,
): ListMoves {
  useEffect(
    () => drag.configure({ sections, lanes, move }),
    [drag, sections, lanes, move],
  );

  return useMemo(
    () => ({ sections, lanes, look: dragLook, drag, move }),
    [sections, lanes, drag, move],
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
}

function useMoveHost({ lanes, ...props }: MovableListProps): MoveHost {
  const shown = useShownMoves(props.children, props.onMove);
  const layer = useRef<ViewInstance>(null);
  const ghost = { x: useSharedValue(0), y: useSharedValue(0) };
  const drag = useListDrag(layer, ghost);
  const own = props.listRef;
  const scrollTo = useColumnScroll({ drag, frame: layer, own, lanes });
  const moves = useConfiguredMoves(drag, shown, lanes);

  return { moves, children: shown.children, layer, ghost, scrollTo };
}

/*
 * A List with `onMove`: its rows move from their context menus, and by dragging. The drag layer sits over the rows,
 * holding the lifted row and the line where it lands; it draws outside the moves, so the lifted copy is a plain row.
 */
export function MovableList(props: MovableListProps): ReactElement {
  const { moves, children, layer, ghost, scrollTo } = useMoveHost(props);

  return (
    <View ref={layer} collapsable={false} className="min-h-0 shrink grow">
      <ListMoveContext value={moves}>
        {props.render(children, scrollTo)}
      </ListMoveContext>
      <ListDragLayer drag={moves.drag} look={dragLook} {...ghost} />
    </View>
  );
}
