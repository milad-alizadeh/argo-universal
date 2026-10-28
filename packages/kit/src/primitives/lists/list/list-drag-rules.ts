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

/*
 * A mouse lifts a row as soon as it drags it. A finger first holds the row: moving before the hold ends scrolls the
 * List instead, and holding still leaves the long press to the row's context menu.
 */
export function dragStart({
  pointer,
  heldFor,
  distance,
}: PressTrack): DragStart {
  if (pointer === 'mouse') return distance >= mouseSlop ? 'lift' : 'wait';

  if (distance <= touchSlop) return 'wait';

  return heldFor >= holdToLift ? 'lift' : 'scroll';
}

// The band along a scrolling edge where a dragged row scrolls it, and the most it scrolls a frame.
export const scrollEdge = 48;
export const scrollStep = 12;

// How far a scroller moves this frame along its axis for a pointer at `at` between `start` and `end`: faster nearer an edge.
export function edgeScroll(at: number, start: number, end: number): number {
  const fromStart = at - start;
  const fromEnd = end - at;

  if (fromStart < scrollEdge && fromStart <= fromEnd)
    return -Math.ceil(scrollStep * (1 - Math.max(fromStart, 0) / scrollEdge));

  if (fromEnd < scrollEdge)
    return Math.ceil(scrollStep * (1 - Math.max(fromEnd, 0) / scrollEdge));

  return 0;
}

export interface Slide {
  // The lifted row's top and height, in the window.
  sourceTop: number;
  height: number;
  // Where the lifted row would land; none while it aims nowhere.
  lineY: number | undefined;
}

// How far a row whose top sits at `top` moves aside while a row is lifted: up into the lifted row's slot, down to open one where it would land.
export function slideOffset(slide: Slide | undefined, top: number): number {
  if (!slide) return 0;

  const closes = top > slide.sourceTop ? -slide.height : 0;
  const opens =
    slide.lineY !== undefined && top >= slide.lineY ? slide.height : 0;

  return closes + opens;
}
