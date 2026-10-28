import { useEffect, useRef, type ReactElement, type RefObject } from 'react';
import {
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native';
import type { DragScroller } from './list-drag-measure';
import { measureView, useListMoves } from './list-move-context';

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
    () => drag?.registerScroller(offsetScroller(axis, view, offset)),
    [drag, axis, view],
  );

  return ({ nativeEvent }) => {
    offset.current = nativeEvent.contentOffset[axis];
  };
}

// A scroll view a dragged row scrolls when it nears its edges: the board sideways, a lane up and down.
export function DragScrollView(props: ScrollViewProps): ReactElement {
  const view = useRef<ScrollViewInstance>(null);
  const onScroll = useDragScroll(props.horizontal ? 'x' : 'y', view);

  return (
    <ScrollView
      ref={view}
      onScroll={onScroll}
      scrollEventThrottle={16}
      {...props}
    />
  );
}
