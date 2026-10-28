import { useEffect, useRef, type ReactElement, type RefObject } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native';
import {
  ScrollFadeView,
  type ScrollFadeViewProps,
} from '../../../scroll-fade/scroll-fade';
import type { DragScroller } from './list-drag-measure';
import { measureView } from './list-measure-view';
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
    () => drag?.registerScroller(offsetScroller(axis, view, offset)),
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

/*
 * A scroll view a dragged row scrolls when it nears its edges: the board, sideways. It fades under the edges that hide
 * more of it, as every content scroll view does. The caller's own `onScroll` still hears every scroll.
 */
export function DragScrollView({
  onScroll,
  ...props
}: ScrollFadeViewProps): ReactElement {
  const view = useRef<ScrollViewInstance>(null);
  const tracked = useDragScroll(props.horizontal ? 'x' : 'y', view);

  return (
    <ScrollFadeView ref={view} {...props} onScroll={both(tracked, onScroll)} />
  );
}
