import type { Point } from './list-geometry';

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
