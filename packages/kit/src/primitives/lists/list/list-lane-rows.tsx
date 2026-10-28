import type { LegendListRef } from '@legendapp/list/react-native';
import { useMemo, type ReactElement, type RefObject } from 'react';
import { RowHighlightProvider } from '../../../row-highlights';
import { ScrollFadeList } from '../../../scroll-fade/scroll-fade-list';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import { childIdentity } from './list-child-identity';
import type { ListChild } from './list-children';
import { childRenderer, ListGrouping, SectionListRow } from './list-grouping';
import type { Lane } from './list-section-entries';

const laneRenderer =
  (lane: Lane) =>
  ({ item, index }: { item: ListChild; index: number }): ReactElement => (
    <SectionListRow
      section={lane.selection}
      index={index}
      count={lane.items.length}
    >
      {childRenderer(item)}
    </SectionListRow>
  );

// A lane's list fills its body, keyed as the List keys its rows.
const laneList = {
  style: { flex: 1 },
  keyExtractor: childIdentity.keyExtractor,
} as const;

// What each lane's list takes from the List: its edge fades, which run up and down a lane, and its keyboard props.
export type LaneScroll = Pick<
  ScrollFadeListProps<ListChild>,
  'edges' | 'keyboardDismissMode' | 'keyboardShouldPersistTaps'
>;

interface LaneRowsProps {
  lane: Lane;
  listRef: RefObject<LegendListRef | null>;
  scroll: LaneScroll;
}

// A lane's rows on their own LegendList, which scrolls up and down.
export function LaneRows({
  lane,
  listRef,
  scroll,
}: LaneRowsProps): ReactElement {
  const renderItem = useMemo(() => laneRenderer(lane), [lane]);
  const rows = { ...scroll, ...laneList, data: lane.items, renderItem };

  return (
    <ListGrouping>
      <RowHighlightProvider>
        <ScrollFadeList ref={listRef} {...rows} />
      </RowHighlightProvider>
    </ListGrouping>
  );
}
