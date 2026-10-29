import type { MeasuredScroller } from './list-drag-measure';
import { inside, type Point } from './list-geometry';

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

const deltaFor = (
  { scroller, rect }: MeasuredScroller,
  point: Point,
): number =>
  scroller.axis === 'y'
    ? edgeScroll(point.y, rect.y, rect.y + rect.height)
    : edgeScroll(point.x, rect.x, rect.x + rect.width);

function scrolledOne(entry: MeasuredScroller, point: Point): boolean {
  const delta = inside(entry.rect, point) ? deltaFor(entry, point) : 0;

  if (delta === 0) return false;

  entry.scroller.scrollBy(delta);

  return true;
}

// Scrolls every scroller the pointer is inside and near an edge of; true when any moved.
export const scrollEdges = (
  scrollers: readonly MeasuredScroller[],
  point: Point,
): boolean =>
  scrollers.map((entry) => scrolledOne(entry, point)).includes(true);
