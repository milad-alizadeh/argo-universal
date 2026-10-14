import { type RefObject, useContext, useLayoutEffect, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { FeedGrowthContext } from '../feed-growth-context';

interface GrowthMarks {
  drawnKeys: readonly string[];
  height: number | null;
  grewAbove: boolean;
}

function grewAboveDrawn(
  drawn: readonly string[],
  keys: readonly string[],
): boolean {
  const [previousFirst] = drawn;

  const previousFirstAt =
    previousFirst === undefined ? -1 : keys.indexOf(previousFirst);

  return previousFirstAt > 0 && keys.length - previousFirstAt === drawn.length;
}

// Records the keys now drawn; true when they added activities above the old first one.
function markDrawn(marks: GrowthMarks, keys: readonly string[]): boolean {
  const grew = grewAboveDrawn(marks.drawnKeys, keys);

  if (grew) marks.grewAbove = true;
  marks.drawnKeys = keys;

  return grew;
}

// Records the measured height; returns how much the activities above added, once.
function measuredGrowth(marks: GrowthMarks, height: number): number | null {
  const previousHeight = marks.height;
  marks.height = height;

  if (!marks.grewAbove || previousHeight === null) return null;
  marks.grewAbove = false;

  return height - previousHeight;
}

function useWillGrowAbove(
  groupKey: string,
  keys: readonly string[],
  marks: RefObject<GrowthMarks>,
): void {
  const feedGrowth = useContext(FeedGrowthContext);
  useLayoutEffect(() => {
    if (markDrawn(marks.current, keys)) feedGrowth?.willGrowAbove(groupKey);
  });
}

function useGrewAbove(
  groupKey: string,
  marks: RefObject<GrowthMarks>,
): (event: LayoutChangeEvent) => void {
  const feedGrowth = useContext(FeedGrowthContext);

  return (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    const growth = measuredGrowth(marks.current, height);

    if (growth !== null) feedGrowth?.grewAbove(groupKey, growth);
  };
}

// Reports to the Feed when an older page brings activities before those already drawn, and how tall they measure.
export function useGrowthAbove(
  groupKey: string,
  keys: readonly string[],
): (event: LayoutChangeEvent) => void {
  const marks = useRef<GrowthMarks>({
    drawnKeys: keys,
    height: null,
    grewAbove: false,
  });

  useWillGrowAbove(groupKey, keys, marks);

  return useGrewAbove(groupKey, marks);
}
