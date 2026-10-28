import {
  useCallback,
  useEffect,
  useRef,
  type ReactElement,
  type Ref,
  type RefObject,
} from 'react';
import {
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native';
import type { ListRef } from '../../../list-ref';
import { assignRef } from '../../../scroll-fade/legend-scroll-ref';
import type { DragScroller } from './list-drag-measure';
import { measureView } from './list-geometry';
import { useListMoves } from './list-move-context';

type Axis = DragScroller['axis'];

type OnScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

// Scrolls `view` by a delta from the offset it last reported.
const offsetScroller = (
  axis: Axis,
  view: RefObject<ScrollViewInstance | null>,
  offset: { current: number },
): DragScroller => ({
  axis,
  measure: () => measureView(view),
  scrollBy: (delta) => {
    offset.current = Math.max(0, offset.current + delta);
    view.current?.scrollTo({ [axis]: offset.current, animated: false });
  },
});

function useDragScroll(
  axis: Axis,
  view: RefObject<ScrollViewInstance | null>,
): OnScroll {
  const offset = useRef(0);
  const drag = useListMoves()?.drag;

  useEffect(
    () => drag?.registry.registerScroller(offsetScroller(axis, view, offset)),
    [drag, axis, view],
  );

  return ({ nativeEvent }) => {
    offset.current = nativeEvent.contentOffset[axis];
  };
}

// Hears every scroll for the drag, then hands it to the caller's own `onScroll`.
const both =
  (tracked: OnScroll, onScroll: ScrollViewProps['onScroll']): OnScroll =>
  (event) => {
    tracked(event);
    onScroll?.(event);
  };

// Keeps the scroll view for the drag, and hands it to the List's own ref.
function useBoardRef(
  own: Ref<ListRef> | undefined,
): [RefObject<ScrollViewInstance | null>, Ref<ScrollViewInstance>] {
  const view = useRef<ScrollViewInstance>(null);

  const ref = useCallback(
    (instance: ScrollViewInstance | null) => {
      view.current = instance;
      assignRef(own, instance);
    },
    [own],
  );

  return [view, ref];
}

type DragScrollViewProps = ScrollViewProps & { listRef?: Ref<ListRef> };

type BoardScroll = ScrollViewProps & { ref: Ref<ScrollViewInstance> };

// The scroll view's props: the drag hears every scroll before the caller's `onScroll`, and the List's ref is kept.
function useBoardScroll({
  listRef,
  onScroll,
  ...props
}: DragScrollViewProps): BoardScroll {
  const [view, ref] = useBoardRef(listRef);
  const tracked = useDragScroll(props.horizontal ? 'x' : 'y', view);

  return {
    scrollEventThrottle: 16,
    ...props,
    ref,
    onScroll: both(tracked, onScroll),
  };
}

/*
 * A scroll view a dragged row scrolls when it nears its edges: the board, sideways. It fills its parent, so each lane's
 * LegendList has a height of its own; a horizontal ScrollFadeView fits its content's height, which a lane's list sets.
 * The caller's own `onScroll` still hears every scroll, and the List's `ref` receives the scroll view.
 */
export function DragScrollView(props: DragScrollViewProps): ReactElement {
  return <ScrollView {...useBoardScroll(props)} />;
}
