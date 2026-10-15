import type { LegendListRef } from '@legendapp/list/react-native';
import type { RefObject } from 'react';

type ListRef = RefObject<LegendListRef | null>;

type ListState = ReturnType<LegendListRef['getState']>;

// While rows measure after a row grows, the Feed holds the reader's place: within this many pixels, for this many still frames, at most this long in milliseconds after the row last grew.
const placeTolerance = 0.5;

const settledFrames = 10;

const keepPlaceDuration = 500;

interface Place {
  key: string;
  // How much the row grew above the content held in place; zero when it grows below.
  height: number;
  // Where the row's top sat in the view before it grew.
  topInView: number;
}

// Where a row's top sits in the view, or undefined once it has left the list.
function topInViewOf(state: ListState, key: string): number | undefined {
  const top = state.positionByKey(key);

  return top === undefined ? undefined : top - state.scroll;
}

// How far the held content sits from where it was, or undefined once the row has left the list.
function driftOf(state: ListState, place: Place): number | undefined {
  const topInView = topInViewOf(state, place.key);

  return topInView === undefined
    ? undefined
    : topInView + place.height - place.topInView;
}

// Puts the held content back where it was; returns the still frames so far, or all of them once the row has left the list.
function placeFrame(
  ref: LegendListRef,
  place: Place,
  stillFrames: number,
): number {
  const drift = driftOf(ref.getState(), place);

  if (drift === undefined) return settledFrames;

  if (Math.abs(drift) > placeTolerance) {
    // Legend List's public anchor offset: "Sets or adds to the offset of the visible content anchor."
    ref.setVisibleContentAnchorOffset((offset) => offset + drift);

    return 0;
  }

  return stillFrames + 1;
}

interface Hold {
  list: ListRef;
  place: Place;
  startedAt: number;
  stillFrames: number;
}

const keepsGoing = (hold: Hold): boolean =>
  hold.stillFrames < settledFrames &&
  performance.now() - hold.startedAt < keepPlaceDuration;

// Holds the place each frame while rows measure; true once it stops.
function holdFrame(hold: Hold): boolean {
  hold.stillFrames = hold.list.current
    ? placeFrame(hold.list.current, hold.place, hold.stillFrames)
    : settledFrames;

  return !keepsGoing(hold);
}

// Starts holding again, as long again as after the row first grew.
function renewHold(hold: Hold): void {
  hold.startedAt = performance.now();
  hold.stillFrames = 0;
}

// One hold per row of each list, so a later place for a row replaces the one before instead of pulling against it.
const holdsByList = new WeakMap<ListRef, Map<string, Hold>>();

function holdsOf(list: ListRef): Map<string, Hold> {
  const holds = holdsByList.get(list) ?? new Map<string, Hold>();
  holdsByList.set(list, holds);

  return holds;
}

function startHold(list: ListRef, place: Place): void {
  const holds = holdsOf(list);
  const hold = { list, place, startedAt: performance.now(), stillFrames: 0 };
  holds.set(place.key, hold);

  const frame = (): void => {
    if (holds.get(place.key) !== hold) return;

    if (holdFrame(hold)) holds.delete(place.key);
    else requestAnimationFrame(frame);
  };

  frame();
}

// Until rows stop measuring, the row's held content stays where it was, whichever row Legend anchors.
export function keepPlace(list: ListRef, place: Place): void {
  const hold = holdsOf(list).get(place.key);

  if (!hold) return startHold(list, place);
  hold.place = place;
  renewHold(hold);
}

// Where a row's top and bottom sit in the view; NaN for a row not in the list, which compares as never in view.
function spanInView(state: ListState, key: string): [number, number] {
  const top = (state.positionByKey(key) ?? Number.NaN) - state.scroll;

  return [top, top + (state.sizes.get(key) ?? Number.NaN)];
}

const reachesIntoView = (
  [top, bottom]: [number, number],
  scrollLength: number,
): boolean => top < scrollLength && bottom > 0;

function startRowTopHold(list: ListRef, state: ListState, key: string): void {
  const span = spanInView(state, key);

  if (reachesIntoView(span, state.scrollLength))
    startHold(list, { key, height: 0, topInView: span[0] });
}

// A row in view that grows below keeps its top where it was, whichever row Legend anchors: Legend can still count rows from before a fast scroll as the ones in view, and anchoring one below the row would push the row up by all it grows. A row already held keeps the place it holds.
export function holdRowTop(list: ListRef, state: ListState, key: string): void {
  const hold = holdsOf(list).get(key);

  if (hold) renewHold(hold);
  else startRowTopHold(list, state, key);
}
