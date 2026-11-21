import { isRightToLeft } from './fader-direction';
import { dragged, type FaderRange } from './fader-math';
import type { FaderProps } from './fader-props';

// A touch that has moved this far along the surface is a drag, not a tap on its content.
export const faderDragThreshold = 6;

export interface DragSource {
  orientation: NonNullable<FaderProps['orientation']>;
  disabled: boolean;
  range: FaderRange;
  value: number;
  size: { width: number; height: number };
  onDrag: (value: number) => void;
}

export interface Point {
  x: number;
  y: number;
}

export interface Moved {
  dx: number;
  dy: number;
}

const mainOf = (
  moved: Moved,
  orientation: DragSource['orientation'],
): number => (orientation === 'vertical' ? moved.dy : moved.dx);

const crossOf = (
  moved: Moved,
  orientation: DragSource['orientation'],
): number => (orientation === 'vertical' ? moved.dx : moved.dy);

const isAlong = (main: number, cross: number): boolean =>
  Math.abs(main) > faderDragThreshold && Math.abs(main) > Math.abs(cross);

// Whether a finger that has moved so far is dragging along the surface rather than across it.
export const along = (moved: Moved, source: DragSource): boolean =>
  !source.disabled &&
  isAlong(
    mainOf(moved, source.orientation),
    crossOf(moved, source.orientation),
  );

const ratio = (part: number, whole: number): number =>
  whole === 0 ? 0 : part / whole;

const leading = (share: number): number => (isRightToLeft() ? -share : share);

// The share of the surface's length a drag covered, positive towards a larger value: up a vertical one, towards the trailing edge of a horizontal one.
export const shareOf = (moved: Moved, source: DragSource): number =>
  source.orientation === 'vertical'
    ? -ratio(moved.dy, source.size.height)
    : leading(ratio(moved.dx, source.size.width));

/*
 * One touch's drag, whichever event system feeds it. It holds the latest props, handed to `update` after each render,
 * so the handlers made once read the value on screen, and the value the drag began from.
 */
export class DragTracker {
  private press: Point | undefined;
  private dragging = false;
  private from = 0;
  private source: DragSource;

  public constructor(source: DragSource) {
    this.source = source;
  }

  public update(source: DragSource): void {
    this.source = source;
  }

  public begin(): void {
    this.from = this.source.value;
  }

  public dragBy(moved: Moved): void {
    const share = shareOf(moved, this.source);

    this.source.onDrag(dragged(this.from, share, this.source.range));
  }

  public down(at: Point): void {
    this.press = at;
    this.dragging = false;
    this.begin();
  }

  // Moves the value when the touch is a drag; true on the move that makes it one, when the touch is the surface's.
  public move(at: Point): boolean {
    const moved = this.movedTo(at);

    return moved ? this.follow(moved) : false;
  }

  public up(): void {
    this.press = undefined;
  }

  private follow(moved: Moved): boolean {
    const began = this.begins(moved);

    if (this.dragging) this.dragBy(moved);

    return began;
  }

  private begins(moved: Moved): boolean {
    const began = !this.dragging && along(moved, this.source);

    this.dragging = this.dragging || began;

    return began;
  }

  private movedTo(at: Point): Moved | undefined {
    return this.press && { dx: at.x - this.press.x, dy: at.y - this.press.y };
  }
}
