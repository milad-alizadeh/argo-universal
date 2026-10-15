import { useMemo, useState } from 'react';
import type { FeedGrowth } from '../feed-growth-context';
import { keepPlace, type ListRef, type ListState } from './keep-place';

// Whether a row reaches into the view and starts above its middle, the reader's line.
const startsAboveReadingLine = (
  state: ListState,
  key: string,
  top: number,
): boolean =>
  top < state.scroll + state.scrollLength / 2 &&
  top + (state.sizes.get(key) ?? 0) > state.scroll;

function markGrowthStart(
  starts: Map<string, number>,
  state: ListState,
  key: string,
): void {
  const top = state.positionByKey(key);

  if (top === undefined || !startsAboveReadingLine(state, key, top)) return;
  starts.set(key, top - state.scroll);
}

function feedGrowthOf(list: ListRef, starts: Map<string, number>): FeedGrowth {
  return {
    willGrowAbove: (key) => {
      const state = list.current?.getState();

      if (state) markGrowthStart(starts, state, key);
    },
    grewAbove: (key, height) => {
      const topInView = starts.get(key);
      starts.delete(key);

      if (topInView === undefined || height <= 0) return;
      keepPlace(list, { key, grownAbove: height, topInView });
    },
  };
}

// Legend keeps the first row fully in view still, so content added inside a row above the reader's line, the middle of the view, would push what they read down.
export function useFeedGrowth(list: ListRef): FeedGrowth {
  const [starts] = useState(() => new Map<string, number>());

  return useMemo(() => feedGrowthOf(list, starts), [list, starts]);
}
