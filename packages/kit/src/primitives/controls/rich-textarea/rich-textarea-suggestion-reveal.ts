import type {
  LegendListRef,
  LegendListState,
} from '@legendapp/list/react-native';
import { useEffect, type RefObject } from 'react';
import { isLegendList, type ListRef } from '#primitives/lists/list';

type ViewPosition = 0 | 1 | undefined;

// A row the List has not drawn yet has no size: it lies beyond the drawn rows.
const beyondDrawn = (state: LegendListState, index: number): ViewPosition =>
  index < state.start ? 0 : 1;

function outOfView(
  state: LegendListState,
  top: number,
  bottom: number,
): ViewPosition {
  if (top < state.scroll) return 0;

  return bottom > state.scroll + state.scrollLength ? 1 : undefined;
}

// Where a row out of view must sit to come into view: at the top when it is above, at the bottom when below.
function viewPosition(list: LegendListRef, index: number): ViewPosition {
  const state = list.getState();
  const top = state.positionAtIndex(index);
  const bottom = top + state.sizeAtIndex(index);

  return Number.isFinite(bottom)
    ? outOfView(state, top, bottom)
    : beyondDrawn(state, index);
}

function reveal(list: LegendListRef, index: number): void {
  const position = viewPosition(list, index);

  if (position === undefined) return;

  void list.scrollToIndex({ index, viewPosition: position, animated: false });
}

const legendList = (list: ListRef | null): LegendListRef | undefined =>
  list && isLegendList(list) ? list : undefined;

/*
 * Scrolls the highlighted row wholly into view, as little as it can, though the rows around it may not be drawn
 * yet. New results reveal it again even when it lands on the same index, because the rows beneath it moved.
 */
export function useRevealRow(
  list: RefObject<ListRef | null>,
  entries: readonly unknown[],
  index: number,
): void {
  useEffect(() => {
    const current = legendList(list.current);

    if (current && index >= 0) reveal(current, index);
  }, [list, entries, index]);
}
