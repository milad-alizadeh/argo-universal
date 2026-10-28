import type { MeasuredScroller } from './list-drag-measure';
import { edgeScroll } from './list-drag-rules';
import type { Point, Rect } from './list-drop-aim';

// Runs `step` on a later frame, returning what cancels it.
export type Schedule = (step: () => void) => () => void;

const animationFrames: Schedule = (step) => {
  const frame = requestAnimationFrame(step);

  return (): void => cancelAnimationFrame(frame);
};

// Runs a step every frame until stopped.
export class FrameLoop {
  private cancelNext: (() => void) | undefined;

  constructor(private readonly schedule: Schedule = animationFrames) {}

  start(step: () => void): void {
    this.stop();

    const next = (): void => {
      step();
      this.cancelNext = this.schedule(next);
    };

    this.cancelNext = this.schedule(next);
  }

  stop(): void {
    this.cancelNext?.();
    this.cancelNext = undefined;
  }
}

const within = (at: number, start: number, size: number): boolean =>
  at >= start && at <= start + size;

const inside = (rect: Rect, { x, y }: Point): boolean =>
  within(x, rect.x, rect.width) && within(y, rect.y, rect.height);

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
