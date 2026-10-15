import { useMemo, useState } from 'react';
import type { FeedGrowth } from '../feed-growth-context';
import {
  joinOpeningRow,
  keepPlace,
  type ListRef,
  type ListState,
  type Place,
} from './keep-place';

// Where a row's content sits before older rows join it, given how tall they measure.
type GrowthStart = (grownAbove: number) => Place;

// Whether a row reaches into the view and starts above its middle, the reader's line.
const startsAboveReadingLine = (
  state: ListState,
  key: string,
  top: number,
): boolean =>
  top < state.scroll + state.scrollLength / 2 &&
  top + (state.sizes.get(key) ?? 0) > state.scroll;

function readingStart(state: ListState, key: string): GrowthStart | undefined {
  const top = state.positionByKey(key);

  if (top === undefined || !startsAboveReadingLine(state, key, top)) return;
  const topInView = top - state.scroll;

  return (grownAbove) => ({ key, grownAbove, topInView });
}

function listReadingStart(list: ListRef, key: string): GrowthStart | undefined {
  const state = list.current?.getState();

  return state && readingStart(state, key);
}

// Older rows that join a row while it opens keep its top, even when they measure only after it has opened.
function growthStart(list: ListRef, key: string): GrowthStart | undefined {
  const opening = joinOpeningRow(list, key);

  return opening ? () => opening : listReadingStart(list, key);
}

type GrowthStarts = Map<string, GrowthStart>;

function grewAboveOf(
  list: ListRef,
  starts: GrowthStarts,
): FeedGrowth['grewAbove'] {
  return (key, height) => {
    const start = starts.get(key);
    starts.delete(key);

    if (start === undefined || height <= 0) return;
    keepPlace(list, start(height));
  };
}

function feedGrowthOf(list: ListRef, starts: GrowthStarts): FeedGrowth {
  return {
    willGrowAbove: (key) => {
      const start = growthStart(list, key);

      if (start) starts.set(key, start);
    },
    grewAbove: grewAboveOf(list, starts),
  };
}

// Legend keeps the first row fully in view still, so content added inside a row above the reader's line, the middle of the view, would push what they read down.
export function useFeedGrowth(list: ListRef): FeedGrowth {
  const [starts] = useState<GrowthStarts>(() => new Map());

  return useMemo(() => feedGrowthOf(list, starts), [list, starts]);
}
