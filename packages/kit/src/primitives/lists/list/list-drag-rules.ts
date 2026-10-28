import type { Point } from './list-drop-aim';

// How far a press may wander before it is a drag or a scroll, and how long a finger holds a row to lift it.
export const mouseSlop = 4;

export const touchSlop = 8;

export const holdToLift = 300;

export interface PressTrack {
  pointer: 'mouse' | 'touch';
  // Milliseconds since the press began.
  heldFor: number;
  // Points from where the press began.
  distance: number;
}

export type DragStart = 'wait' | 'lift' | 'scroll';

const mouseStart = (distance: number): DragStart =>
  distance >= mouseSlop ? 'lift' : 'wait';

function touchStart(heldFor: number, distance: number): DragStart {
  if (distance <= touchSlop) return 'wait';

  return heldFor >= holdToLift ? 'lift' : 'scroll';
}

/*
 * A mouse lifts a row as soon as it drags it. A finger first holds the row: moving before the hold ends scrolls the
 * List instead, and holding still leaves the long press to the row's context menu.
 */
export const dragStart = ({
  pointer,
  heldFor,
  distance,
}: PressTrack): DragStart =>
  pointer === 'mouse' ? mouseStart(distance) : touchStart(heldFor, distance);

// Where and when a press began, and with what.
export interface PressStart {
  start: Point;
  at: number;
  pointer: PressTrack['pointer'];
}

// What a press begun as `press` does once its pointer is at `at`, `now`.
export const startAt = (press: PressStart, at: Point, now: number): DragStart =>
  dragStart({
    pointer: press.pointer,
    heldFor: now - press.at,
    distance: Math.hypot(at.x - press.start.x, at.y - press.start.y),
  });

// The band along a scrolling edge where a dragged row scrolls it, and the most it scrolls a frame.
export const scrollEdge = 48;

export const scrollStep = 12;

// The step for a pointer `gap` points inside an edge: the full step at the edge, none at the band's inner side.
const stepAt = (gap: number): number =>
  Math.ceil(scrollStep * (1 - Math.max(gap, 0) / scrollEdge));

// The step toward the nearer edge, `gap` points away, `toward` -1 for the start and 1 for the end; none outside its band.
const stepWithin = (gap: number, toward: -1 | 1): number =>
  gap < scrollEdge ? toward * stepAt(gap) : 0;

// How far a scroller moves this frame along its axis for a pointer at `at` between `start` and `end`: faster nearer an edge.
export function edgeScroll(at: number, start: number, end: number): number {
  const fromStart = at - start;
  const fromEnd = end - at;

  return fromStart <= fromEnd
    ? stepWithin(fromStart, -1)
    : stepWithin(fromEnd, 1);
}

export interface Slide {
  // The lifted row's top and height, in the window.
  sourceTop: number;
  height: number;
  // Where the lifted row would land; none while it aims nowhere.
  lineY: number | undefined;
}

// Rows below the lifted row's slot close it up.
const closesAt = (slide: Slide, top: number): number =>
  top > slide.sourceTop ? -slide.height : 0;

const below = (top: number, lineY: number | undefined): boolean =>
  lineY !== undefined && top >= lineY;

// Rows below where the lifted row would land open a slot for it.
const opensAt = (slide: Slide, top: number): number =>
  below(top, slide.lineY) ? slide.height : 0;

// How far a row whose top sits at `top` moves aside while a row is lifted: up into the lifted row's slot, down to open one where it would land.
export function slideOffset(slide: Slide | undefined, top: number): number {
  if (!slide) return 0;

  return closesAt(slide, top) + opensAt(slide, top);
}
