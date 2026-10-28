import type { LegendListRef } from '@legendapp/list/react-native';
import {
  createContext,
  useCallback,
  useContext,
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
import { assignRef } from '../../../scroll-fade/legend-scroll-ref';
import { ListDrag } from './list-drag-controller';
import { ListDragLayer } from './list-drag-layer';
import { dragLook, type DragLook } from './list-drag-look';
import type { Rect } from './list-drop-aim';
import {
  movedSections,
  type ListMove,
  type MoveSection,
} from './list-move-model';
import { moveSections, reorderedChildren } from './list-move-sections';
import type { ListProps } from './list-props';

export interface ListMoves {
  sections: readonly MoveSection[];
  lanes: boolean;
  look: DragLook;
  drag: ListDrag;
  move: (move: ListMove) => void;
}

const ListMoveContext = createContext<ListMoves | null>(null);

// The moves of the List around a row, when it has `onMove`.
export const useListMoves = (): ListMoves | null => useContext(ListMoveContext);

// Measures a drawn view in the window, as a drag hit-tests and draws.
export function measureView(
  view: RefObject<Pick<ViewInstance, 'measureInWindow'> | null>,
): Promise<Rect | undefined> {
  return new Promise((resolve) => {
    if (!view.current) return resolve(undefined);

    view.current.measureInWindow((x, y, width, height) =>
      resolve({ x, y, width, height }),
    );
  });
}

interface PendingMove {
  move: ListMove;
  // The order the move was made on; once the owner draws another, its answer stands instead.
  order: string;
}

const thenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  'then' in value &&
  typeof value.then === 'function';

interface ShownMoves {
  sections: readonly MoveSection[];
  children: ReactNode;
  move: (move: ListMove) => void;
}

/*
 * A move shows at once: the List draws its rows in the moved order until its owner draws a new order, or answers
 * without one, a frame after its `onMove` settles.
 */
function useShownMoves(
  children: ReactNode,
  onMove: NonNullable<ListProps<never>['onMove']>,
): ShownMoves {
  const sections = useMemo(() => moveSections(children), [children]);
  const order = useMemo(() => JSON.stringify(sections), [sections]);
  const [pending, setPending] = useState<PendingMove>();
  const held = pending?.order === order ? pending.move : undefined;

  const shown = useMemo(
    () => (held ? movedSections(sections, held) : sections),
    [held, sections],
  );

  const move = useCallback(
    (next: ListMove) => {
      setPending({ move: next, order });

      const settle = (): void => {
        requestAnimationFrame(() =>
          setPending((current) =>
            current?.move === next ? undefined : current,
          ),
        );
      };
      const answer: unknown = onMove(next);

      if (thenable(answer)) answer.then(settle, settle);
      else settle();
    },
    [onMove, order],
  );

  const shownChildren = useMemo(
    () => (held ? reorderedChildren(children, shown) : children),
    [held, children, shown],
  );

  return { sections: shown, children: shownChildren, move };
}

function useListDrag(
  layer: RefObject<ViewInstance | null>,
  ghost: { x: SharedValue<number>; y: SharedValue<number> },
): ListDrag {
  const [drag] = useState(
    () =>
      new ListDrag(
        () => measureView(layer),
        (point) => {
          ghost.x.value = point.x;
          ghost.y.value = point.y;
        },
      ),
  );

  useEffect(() => () => drag.cancel(), [drag]);

  return drag;
}

interface MovableListProps {
  onMove: NonNullable<ListProps<never>['onMove']>;
  lanes: boolean;
  children: ReactNode;
  // The List's own ref, kept on its scroll view.
  listRef: Ref<LegendListRef> | undefined;
  // Draws the List's rows, in the order they show, on a scroll view taking `ref`.
  render: (children: ReactNode, ref: Ref<LegendListRef>) => ReactElement;
}

// One column scrolls up and down under a row dragged near its top or bottom edge.
function useColumnScroll(
  drag: ListDrag,
  frame: RefObject<ViewInstance | null>,
  own: Ref<LegendListRef> | undefined,
  lanes: boolean,
): Ref<LegendListRef> {
  const list = useRef<LegendListRef>(null);

  useEffect(() => {
    if (lanes) return;

    return drag.registerScroller({
      axis: 'y',
      measure: () => measureView(frame),
      scrollBy: (delta) => {
        const scroll = list.current?.getState().scroll ?? 0;

        void list.current?.scrollToOffset({
          offset: Math.max(0, scroll + delta),
          animated: false,
        });
      },
    });
  }, [drag, frame, lanes]);

  return useCallback(
    (instance: LegendListRef | null) => {
      list.current = instance;
      assignRef(own, instance);
    },
    [own],
  );
}

/*
 * A List with `onMove`: its rows move from their context menus, and by dragging. The drag layer sits over the rows,
 * holding the lifted row and the line where it lands.
 */
export function MovableList({
  onMove,
  lanes,
  children,
  listRef,
  render,
}: MovableListProps): ReactElement {
  const shown = useShownMoves(children, onMove);
  const layer = useRef<ViewInstance>(null);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const drag = useListDrag(layer, { x, y });
  const scrollRef = useColumnScroll(drag, layer, listRef, lanes);

  useEffect(
    () => drag.configure({ sections: shown.sections, lanes, move: shown.move }),
    [drag, shown.sections, lanes, shown.move],
  );

  const moves = useMemo(
    () => ({
      sections: shown.sections,
      lanes,
      look: dragLook,
      drag,
      move: shown.move,
    }),
    [shown.sections, lanes, drag, shown.move],
  );

  return (
    <ListMoveContext value={moves}>
      <View ref={layer} collapsable={false} className="min-h-0 shrink grow">
        {render(shown.children, scrollRef)}
        <ListDragLayer drag={drag} look={dragLook} x={x} y={y} />
      </View>
    </ListMoveContext>
  );
}
