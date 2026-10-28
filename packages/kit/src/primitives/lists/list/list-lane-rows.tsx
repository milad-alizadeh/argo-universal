import type { LegendListRef } from '@legendapp/list/react-native';
import { useMemo, type ReactElement, type RefObject } from 'react';
import { RowHighlightProvider } from '../../../row-highlights';
import { ScrollFadeList } from '../../../scroll-fade/scroll-fade-list';
import { childIdentity } from './list-child-identity';
import type { ListChild } from './list-children';
import { childRenderer, ListGrouping, SectionListRow } from './list-grouping';
import type { Lane } from './list-lane-model';

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

interface LaneRowsProps {
  lane: Lane;
  listRef: RefObject<LegendListRef | null>;
}

// A lane's rows on their own LegendList, which scrolls up and down.
export function LaneRows({ lane, listRef }: LaneRowsProps): ReactElement {
  const renderItem = useMemo(() => laneRenderer(lane), [lane]);

  return (
    <ListGrouping>
      <RowHighlightProvider>
        <ScrollFadeList
          ref={listRef}
          {...laneList}
          data={lane.items}
          renderItem={renderItem}
        />
      </RowHighlightProvider>
    </ListGrouping>
  );
}
