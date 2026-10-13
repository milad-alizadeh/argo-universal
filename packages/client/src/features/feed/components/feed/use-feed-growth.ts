import type { LegendListRef } from '@legendapp/list/react-native';
import { type RefObject, useMemo, useState } from 'react';
import type { FeedGrowth } from '../feed-growth-context';

type ListRef = RefObject<LegendListRef | null>;

type ListState = ReturnType<LegendListRef['getState']>;

// While rows measure after content grows above the reader, the Feed holds their place: within this many pixels, for this many still frames, at most this long in milliseconds.
const placeTolerance = 0.5;

const settledFrames = 10;

const keepPlaceDuration = 500;

interface Growth {
  key: string;
  height: number;
  // Where the row's top sat in the view before it grew.
  topInView: number;
}

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

// How far the row's old content sits from where it was, or undefined once the row has left the list.
function driftOf(state: ListState, growth: Growth): number | undefined {
  const top = state.positionByKey(growth.key);

  return top === undefined
    ? undefined
    : top + growth.height - growth.topInView - state.scroll;
}

// Puts the row's old content back where it was; returns the still frames so far, or all of them once the row has left the list.
function placeFrame(
  ref: LegendListRef,
  growth: Growth,
  stillFrames: number,
): number {
  const drift = driftOf(ref.getState(), growth);

  if (drift === undefined) return settledFrames;

  if (Math.abs(drift) > placeTolerance) {
    ref.setVisibleContentAnchorOffset((offset) => offset + drift);

    return 0;
  }

  return stillFrames + 1;
}

const keepsGoing = (stillFrames: number, startedAt: number): boolean =>
  stillFrames < settledFrames &&
  performance.now() - startedAt < keepPlaceDuration;

// Until rows stop measuring, the row's old content stays where it was, whichever row Legend anchors.
function keepPlace(list: ListRef, growth: Growth): void {
  const startedAt = performance.now();
  let stillFrames = 0;

  const frame = (): void => {
    stillFrames = list.current
      ? placeFrame(list.current, growth, stillFrames)
      : settledFrames;

    if (keepsGoing(stillFrames, startedAt)) requestAnimationFrame(frame);
  };

  frame();
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
      keepPlace(list, { key, height, topInView });
    },
  };
}

// Legend keeps the first row fully in view still, so content added inside a row above the reader's line, the middle of the view, would push what they read down.
export function useFeedGrowth(list: ListRef): FeedGrowth {
  const [starts] = useState(() => new Map<string, number>());

  return useMemo(() => feedGrowthOf(list, starts), [list, starts]);
}
