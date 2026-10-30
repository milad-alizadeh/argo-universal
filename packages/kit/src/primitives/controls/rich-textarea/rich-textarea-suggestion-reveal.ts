import type { LegendListRef } from '@legendapp/list/react-native';
import { useEffect, type RefObject } from 'react';
import { isLegendList, type ListRef } from '#primitives/lists/list';

// Where a row out of view must sit to come into view: at the top when it is above, at the bottom when below.
function viewPosition(list: LegendListRef, index: number): 0 | 1 | undefined {
  const state = list.getState();
  const top = state.positionAtIndex(index);
  const bottom = top + state.sizeAtIndex(index);

  // A row the List has not drawn yet has no size: it lies beyond the drawn rows.
  if (!Number.isFinite(bottom)) return index < state.start ? 0 : 1;

  if (top < state.scroll) return 0;

  return bottom > state.scroll + state.scrollLength ? 1 : undefined;
}

function reveal(list: LegendListRef, index: number): void {
  const position = viewPosition(list, index);

  if (position === undefined) return;
  void list.scrollToIndex({ index, viewPosition: position, animated: false });
}

// Scrolls the highlighted row wholly into view, as little as it can, though the rows around it may not be drawn yet.
export function useRevealRow(
  list: RefObject<ListRef | null>,
  index: number,
): void {
  useEffect(() => {
    const current = list.current;

    if (index >= 0 && current && isLegendList(current)) reveal(current, index);
  }, [list, index]);
}
