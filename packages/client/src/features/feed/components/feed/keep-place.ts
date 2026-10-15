import type {
  LegendListRef,
  LegendListState,
} from '@legendapp/list/react-native';
import type { RefObject } from 'react';

export type ListRef = RefObject<LegendListRef | null>;

export type ListState = LegendListState;

const placeTolerance = 0.5;

const settledFrames = 10;

const keepPlaceDuration = 500;

interface Place {
  key: string;
  grownAbove: number;
  topInView: number;
}

interface Span {
  top: number;
  bottom: number;
}

function spanInView(state: ListState, key: string): Span | undefined {
  const position = state.positionByKey(key);
  const size = state.sizes.get(key);

  if (position === undefined || size === undefined) return;
  const top = position - state.scroll;

  return { top, bottom: top + size };
}

const stateOf = (list: ListRef): ListState | undefined =>
  list.current?.getState();

function spanOf(list: ListRef, key: string): Span | undefined {
  const state = stateOf(list);

  return state && spanInView(state, key);
}

interface Hold {
  list: ListRef;
  place: Place;
  opening: boolean;
  startedAt: number;
  stillFrames: number;
}

function driftOf({ list, place }: Hold): number | undefined {
  const span = spanOf(list, place.key);

  return span && span.top + place.grownAbove - place.topInView;
}

function steer(hold: Hold, drift: number): void {
  if (Math.abs(drift) > placeTolerance) {
    hold.list.current?.setVisibleContentAnchorOffset(
      (offset) => offset + drift,
    );
    hold.stillFrames = 0;
  } else hold.stillFrames += 1;
}

const settling = (hold: Hold): boolean =>
  hold.stillFrames < settledFrames &&
  performance.now() - hold.startedAt < keepPlaceDuration;

function keepsHolding(hold: Hold): boolean {
  const drift = driftOf(hold);

  if (drift === undefined) return false;
  steer(hold, drift);

  return hold.opening || settling(hold);
}

// One hold per row of each list: a later place for a row replaces the one before instead of pulling against it.
const holdsByList = new WeakMap<ListRef, Map<string, Hold>>();

function holdsOf(list: ListRef): Map<string, Hold> {
  const holds = holdsByList.get(list) ?? new Map<string, Hold>();
  holdsByList.set(list, holds);

  return holds;
}

function runHold(holds: Map<string, Hold>, hold: Hold): void {
  const frame = (): void => {
    if (holds.get(hold.place.key) !== hold) return;

    if (keepsHolding(hold)) requestAnimationFrame(frame);
    else holds.delete(hold.place.key);
  };

  frame();
}

function startHold(holds: Map<string, Hold>, hold: Hold): void {
  holds.set(hold.place.key, hold);
  runHold(holds, hold);
}

function placeHold(list: ListRef, place: Place, opening: boolean): void {
  const holds = holdsOf(list);
  const hold = holds.get(place.key);
  const renewed = { place, opening, startedAt: performance.now() };

  if (hold) Object.assign(hold, renewed, { stillFrames: 0 });
  else startHold(holds, { list, ...renewed, stillFrames: 0 });
}

const isOpening = (list: ListRef, key: string): boolean =>
  holdsOf(list).get(key)?.opening ?? false;

export function keepPlace(list: ListRef, place: Place): void {
  if (!isOpening(list, place.key)) placeHold(list, place, false);
}

const reachesIntoView = (span: Span, scrollLength: number): boolean =>
  span.top < scrollLength && span.bottom > 0;

const opensInView = (state: ListState, span: Span): boolean =>
  reachesIntoView(span, state.scrollLength) &&
  !state.isWithinMaintainScrollAtEndThreshold;

function openingSpan(state: ListState, key: string): Span | undefined {
  const span = spanInView(state, key);

  return span && opensInView(state, span) ? span : undefined;
}

function startRowTopHold(list: ListRef, key: string): void {
  const state = stateOf(list);
  const span = state && openingSpan(state, key);

  if (span) placeHold(list, { key, grownAbove: 0, topInView: span.top }, true);
}

/*
 * Legend can still count rows from before a fast scroll as the ones in view, and anchoring one below an
 * opening row would push the row up by all it grows, so the row's top stays where it was until it has
 * opened. The reader reads the row they opened, so its top replaces a place held for older rows, and
 * older rows that join it while it opens draw below its top. At the end, where the Feed follows new rows,
 * and once the row has opened, when the Feed follows them again, the row is left to Legend, so the hold
 * never pulls against following the end.
 */
export function holdRowTop(list: ListRef, key: string): void {
  if (!isOpening(list, key)) startRowTopHold(list, key);
}

export function releaseRowTop(list: ListRef, key: string): void {
  if (isOpening(list, key)) holdsOf(list).delete(key);
}
