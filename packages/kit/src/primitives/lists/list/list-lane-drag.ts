import type { LegendListRef } from '@legendapp/list/react-native';
import { useEffect, type RefObject } from 'react';
import type { ViewInstance } from 'react-native';
import { legendScroller } from './list-column-scroll';
import type { ListDrag } from './list-drag-controller';
import type { MeasureZone } from './list-drag-measure';
import { measureView } from './list-geometry';
import { useListMoves } from './list-move-context';
import type { SectionKey } from './list-move-model';
import { useMoveOrder } from './list-move-order';

export interface LaneViews {
  lane: RefObject<ViewInstance | null>;
  body: RefObject<ViewInstance | null>;
  list: RefObject<LegendListRef | null>;
}

// A lane across, and where its rows start: the top of its scrolling body.
const measureLane = async ({
  lane,
  body,
}: LaneViews): ReturnType<MeasureZone> => {
  const [rect, rows] = await Promise.all([
    measureView(lane),
    measureView(body),
  ]);

  return rect && rows && { rect, start: rows.y };
};

// Registers a lane as the zone of Section `key` and its body as a scroller; returns the unregister.
function registerLane(
  drag: ListDrag,
  key: SectionKey,
  views: LaneViews,
): () => void {
  const zone = drag.registry.registerZone(key, () => measureLane(views));

  // A lane's body scrolls up and down when a dragged row nears its top or bottom.
  const scroller = drag.registry.registerScroller(
    legendScroller(views.body, views.list),
  );

  return (): void => {
    zone();
    scroller();
  };
}

// A row dragged anywhere over a lane lands in its Section, when its rows move; it scrolls near the lane's edges.
export function useLaneDrag(key: SectionKey, views: LaneViews): void {
  const moves = useListMoves();
  const drag = moves?.drag;
  const moving = useMoveOrder(moves?.order, (order) => order.holds(key));

  useEffect(() => {
    return drag && moving ? registerLane(drag, key, views) : undefined;
  }, [drag, moving, key, views]);
}
