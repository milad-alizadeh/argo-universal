import type { LegendListRef } from '@legendapp/list/react-native';
import {
  useCallback,
  useEffect,
  useRef,
  type Ref,
  type RefObject,
} from 'react';
import type { ViewInstance } from 'react-native';
import { isLegendList, type ListRef } from '../../../list-ref';
import { assignRef } from '../../../scroll-fade/legend-scroll-ref';
import type { ListDrag } from './list-drag-controller';
import type { DragScroller } from './list-drag-measure';
import { measureView } from './list-geometry';

export function scrolledBy(list: LegendListRef | null, delta: number): void {
  if (!list) return;

  const offset = Math.max(0, list.getState().scroll + delta);

  void list.scrollToOffset({ offset, animated: false });
}

// A LegendList inside `view` scrolls up and down under a row dragged near the view's top or bottom edge.
export const legendScroller = (
  view: RefObject<ViewInstance | null>,
  list: RefObject<LegendListRef | null>,
): DragScroller => ({
  axis: 'y',
  measure: () => measureView(view),
  scrollBy: (delta) => scrolledBy(list.current, delta),
});

// One column scrolls up and down under a row dragged near its top or bottom edge.
export interface ColumnScroll {
  drag: ListDrag;
  // The view the List's rows scroll inside.
  frame: RefObject<ViewInstance | null>;
  // The ref the List's owner passed, which still receives the scroller.
  own: Ref<ListRef> | undefined;
  lanes: boolean;
}

function useColumnScroller(
  { drag, frame, lanes }: ColumnScroll,
  list: RefObject<LegendListRef | null>,
): void {
  useEffect(() => {
    if (lanes) return;

    return drag.registerScroller(legendScroller(frame, list));
  }, [drag, frame, lanes, list]);
}

// The ref for the column's scroll view: the drag scrolls it, and the owner's ref still receives it, or the board of lanes.
export function useColumnScroll(column: ColumnScroll): Ref<ListRef> {
  const list = useRef<LegendListRef>(null);
  const { own } = column;

  useColumnScroller(column, list);

  return useCallback(
    (instance: ListRef | null) => {
      list.current = instance && isLegendList(instance) ? instance : null;
      assignRef(own, instance);
    },
    [own],
  );
}
