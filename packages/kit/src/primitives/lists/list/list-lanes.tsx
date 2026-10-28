import {
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  ScrollView,
  type ScrollViewInstance,
  type ViewInstance,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { ListSelection } from '../../../list-context';
import { RowHighlightProvider } from '../../../row-highlights';
import type { ListChild } from './list-children';
import { childRenderer, ListGrouping, SectionListRow } from './list-grouping';
import { measureView, useListMoves } from './list-moves';
import { sectionItems } from './list-section-entries';
import type { ListBlock } from './list-section-model';

interface DragScroll {
  ref: RefObject<ScrollViewInstance | null>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

// A scroll view a dragged row scrolls when it nears its edges: the board sideways, a lane up and down.
function useDragScroll(axis: 'x' | 'y'): DragScroll {
  const ref = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);
  const drag = useListMoves()?.drag;

  useEffect(
    () =>
      drag?.registerScroller({
        axis,
        measure: () => measureView(ref),
        scrollBy: (delta) => {
          offset.current = Math.max(0, offset.current + delta);
          ref.current?.scrollTo({ [axis]: offset.current, animated: false });
        },
      }),
    [drag, axis],
  );

  return {
    ref,
    onScroll: ({ nativeEvent }) => {
      offset.current = nativeEvent.contentOffset[axis];
    },
  };
}

interface Lane {
  key: string;
  // The Section's id; none for rows outside any Section.
  id?: string;
  header: ReactNode;
  footer: ReactNode;
  items: ListChild[];
  selection: ListSelection;
}

function lanesOf(blocks: readonly ListBlock[]): Lane[] {
  return blocks.map((block) =>
    block.kind === 'items'
      ? {
          key: block.key,
          header: null,
          footer: null,
          items: block.items,
          selection: {},
        }
      : {
          key: block.key,
          id: block.section.id,
          header: block.section.header,
          footer: block.section.footer,
          items: sectionItems(block.blocks, block.section),
          selection: block.section.selection,
        },
  );
}

// Where a lane's rows start, and the lane across: a row dragged anywhere over it lands in its Section.
function useLaneZone(
  id: string | undefined,
  lane: RefObject<ViewInstance | null>,
  body: RefObject<ViewInstance | null>,
): void {
  const moves = useListMoves();
  const index = moves
    ? moves.sections.findIndex((section) => section.id === id)
    : -1;
  const drag = moves?.drag;

  useEffect(() => {
    if (!drag || index === -1) return;

    return drag.registerZone(index, async () => {
      const [rect, rows] = await Promise.all([
        measureView(lane),
        measureView(body),
      ]);

      return rect && rows && { rect, start: rows.y };
    });
  }, [drag, index, lane, body]);
}

function LaneRows({ lane }: { lane: Lane }): ReactElement {
  return (
    <ListGrouping>
      <RowHighlightProvider>
        {lane.items.map((item, index) => (
          <SectionListRow
            key={item.key}
            section={lane.selection}
            index={index}
            count={lane.items.length}
          >
            {childRenderer(item)}
          </SectionListRow>
        ))}
      </RowHighlightProvider>
    </ListGrouping>
  );
}

function BoardLane({ lane }: { lane: Lane }): ReactElement {
  const frame = useRef<ViewInstance>(null);
  const body = useRef<ViewInstance>(null);
  const scroll = useDragScroll('y');
  useLaneZone(lane.id, frame, body);

  return (
    <View ref={frame} collapsable={false} className="w-72 shrink-0">
      {lane.header}
      <ScrollView
        ref={scroll.ref}
        onScroll={scroll.onScroll}
        scrollEventThrottle={16}
        className="min-h-0 grow"
      >
        <View ref={body} collapsable={false} className="pb-4">
          <LaneRows lane={lane} />
        </View>
      </ScrollView>
      {lane.footer}
    </View>
  );
}

/*
 * Each Section a lane, side by side, on a wide desktop or web window: the board scrolls sideways and each lane up and
 * down. Rows outside any Section form a lane of their own, without a header.
 */
export function SectionLanes({
  blocks,
}: {
  blocks: ListBlock[];
}): ReactElement {
  const board = useDragScroll('x');

  return (
    <ScrollView
      ref={board.ref}
      onScroll={board.onScroll}
      scrollEventThrottle={16}
      horizontal
      className="min-h-0 grow"
      contentContainerClassName="gap-4 px-4"
    >
      {lanesOf(blocks).map((lane) => (
        <BoardLane key={lane.key} lane={lane} />
      ))}
    </ScrollView>
  );
}
