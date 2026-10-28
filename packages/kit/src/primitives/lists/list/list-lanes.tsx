import type { LegendListRef } from '@legendapp/list/react-native';
import {
  useEffect,
  useMemo,
  useRef,
  type ReactElement,
  type RefObject,
} from 'react';
import { View, type ViewInstance } from 'react-native';
import { OutsideColumn } from '../../../content-column/content-column';
import { legendScroller } from './list-column-scroll';
import type { ListDrag } from './list-drag-controller';
import type { MeasureZone } from './list-drag-measure';
import { DragScrollView } from './list-drag-scroll-view';
import { measureView } from './list-geometry';
import { LaneRows } from './list-lane-rows';
import { useListMoves } from './list-move-context';
import { useMoveOrder } from './list-move-order';
import { lanesOf, type Lane } from './list-section-entries';
import type { ListBlock } from './list-section-model';

interface LaneViews {
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
  key: string,
  views: LaneViews,
): () => void {
  const zone = drag.registerZone(key, () => measureLane(views));

  // A lane's body scrolls up and down when a dragged row nears its top or bottom.
  const scroller = drag.registerScroller(
    legendScroller(views.body, views.list),
  );

  return (): void => {
    zone();
    scroller();
  };
}

// A row dragged anywhere over a lane lands in its Section, when its rows move; it scrolls near the lane's edges.
function useLaneDrag(key: string, views: LaneViews): void {
  const moves = useListMoves();
  const drag = moves?.drag;
  const moving = useMoveOrder(moves?.order, (order) => order.holds(key));

  useEffect(() => {
    return drag && moving ? registerLane(drag, key, views) : undefined;
  }, [drag, moving, key, views]);
}

interface LaneBodyProps {
  lane: Lane;
  laneRef: RefObject<ViewInstance | null>;
}

function LaneBody({ lane, laneRef }: LaneBodyProps): ReactElement {
  const bodyRef = useRef<ViewInstance>(null);
  const listRef = useRef<LegendListRef>(null);

  const views = useMemo(
    () => ({ lane: laneRef, body: bodyRef, list: listRef }),
    [laneRef],
  );

  useLaneDrag(lane.key, views);

  return (
    <View ref={bodyRef} collapsable={false} className="min-h-0 grow">
      <LaneRows lane={lane} listRef={listRef} />
    </View>
  );
}

// A lane reads as a group named after its Section.
const namedGroup = (title: string | undefined) =>
  ({ role: 'group', accessibilityLabel: title }) as const;

function BoardLane({ lane }: { lane: Lane }): ReactElement {
  const laneRef = useRef<ViewInstance>(null);

  return (
    <View
      ref={laneRef}
      collapsable={false}
      {...namedGroup(lane.title)}
      className="w-72 shrink-0 pb-4"
    >
      {lane.header}
      <LaneBody lane={lane} laneRef={laneRef} />
      {lane.footer}
    </View>
  );
}

const boardLane = (lane: Lane): ReactElement => (
  <BoardLane key={lane.key} lane={lane} />
);

interface LanesProps {
  blocks: ListBlock[];
  // The key of the rows outside any Section.
  looseKey: string;
}

/*
 * Each Section a lane, side by side, on a wide desktop or web window: the board scrolls sideways and each lane up and
 * down on its own LegendList (ADR-0032). Rows outside any Section form one lane of their own, without a header.
 */
export function SectionLanes({ blocks, looseKey }: LanesProps): ReactElement {
  const lanes = useMemo(() => lanesOf(blocks, looseKey), [blocks, looseKey]);

  return (
    <DragScrollView
      horizontal
      className="min-h-0 grow"
      contentContainerClassName="gap-4 px-4"
    >
      <OutsideColumn>{lanes.map(boardLane)}</OutsideColumn>
    </DragScrollView>
  );
}
