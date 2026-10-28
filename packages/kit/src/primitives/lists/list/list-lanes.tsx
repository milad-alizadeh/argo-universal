import { useEffect, useRef, type ReactElement, type RefObject } from 'react';
import { View, type ViewInstance } from 'react-native';
import { RowHighlightProvider } from '../../../row-highlights';
import type { ListChild } from './list-children';
import type { MeasureZone } from './list-drag-measure';
import { DragScrollView } from './list-drag-scroll-view';
import { childRenderer, ListGrouping, SectionListRow } from './list-grouping';
import { lanesOf, type Lane } from './list-lane-model';
import { measureView, useListMoves, type ListMoves } from './list-move-context';
import type { ListBlock } from './list-section-model';

interface LaneViews {
  lane: RefObject<ViewInstance | null>;
  body: RefObject<ViewInstance | null>;
}

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

const sectionIndex = (moves: ListMoves | null, id?: string): number =>
  moves ? moves.sections.findIndex((section) => section.id === id) : -1;

// Where a lane's rows start, and the lane across: a row dragged anywhere over it lands in its Section.
function useLaneZone(id: string | undefined, views: LaneViews): void {
  const moves = useListMoves();
  const index = sectionIndex(moves, id);
  const drag = moves?.drag;

  useEffect(() => {
    if (!drag || index === -1) return;

    return drag.registerZone(index, () => measureLane(views));
  }, [drag, index, views]);
}

interface LaneRowProps {
  lane: Lane;
  item: ListChild;
  index: number;
}

function LaneRow({ lane, item, index }: LaneRowProps): ReactElement {
  const count = lane.items.length;

  return (
    <SectionListRow section={lane.selection} index={index} count={count}>
      {childRenderer(item)}
    </SectionListRow>
  );
}

function LaneRows({ lane }: { lane: Lane }): ReactElement {
  return (
    <ListGrouping>
      <RowHighlightProvider>
        {lane.items.map((item, index) => (
          <LaneRow key={item.key} lane={lane} item={item} index={index} />
        ))}
      </RowHighlightProvider>
    </ListGrouping>
  );
}

interface LaneBodyProps {
  lane: Lane;
  body: LaneViews['body'];
}

function LaneBody({ lane, body }: LaneBodyProps): ReactElement {
  return (
    <DragScrollView className="min-h-0 grow">
      <View ref={body} collapsable={false} className="pb-4">
        <LaneRows lane={lane} />
      </View>
    </DragScrollView>
  );
}

function BoardLane({ lane }: { lane: Lane }): ReactElement {
  const frame = useRef<ViewInstance>(null);
  const body = useRef<ViewInstance>(null);

  useLaneZone(lane.id, { lane: frame, body });

  return (
    <View ref={frame} collapsable={false} className="w-72 shrink-0">
      {lane.header}
      <LaneBody lane={lane} body={body} />
      {lane.footer}
    </View>
  );
}

interface LanesProps {
  blocks: ListBlock[];
}

/*
 * Each Section a lane, side by side, on a wide desktop or web window: the board scrolls sideways and each lane up and
 * down. Rows outside any Section form a lane of their own, without a header.
 */
export function SectionLanes({ blocks }: LanesProps): ReactElement {
  return (
    <DragScrollView
      horizontal
      className="min-h-0 grow"
      contentContainerClassName="gap-4 px-4"
    >
      {lanesOf(blocks).map((lane) => (
        <BoardLane key={lane.key} lane={lane} />
      ))}
    </DragScrollView>
  );
}
