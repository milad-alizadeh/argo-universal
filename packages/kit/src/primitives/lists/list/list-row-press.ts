import type { ReactNode } from 'react';
import type { ListDrag } from './list-drag-controller';
import { startAt, type PressStart } from './list-drag-rules';
import type { Point } from './list-drop-aim';

export interface PressTarget {
  drag: ListDrag;
  id: string;
  ghost: ReactNode;
}

export interface WebPressStart extends PressStart {
  pointerId: number;
}

export const pointOf = (event: {
  clientX: number;
  clientY: number;
}): Point => ({
  x: event.clientX,
  y: event.clientY,
});

const prevent = (event: Event): void => event.preventDefault();

const swallow = (event: MouseEvent): void => {
  event.stopPropagation();
  event.preventDefault();
};

// The click a drag's release sends to the row it began on, swallowed so a dropped row is not also pressed.
function swallowReleaseClick(): void {
  window.addEventListener('click', swallow, { capture: true, once: true });
  // A release away from the row sends no click; the next real one goes through.
  setTimeout(() => window.removeEventListener('click', swallow, true));
}

/*
 * One press on a row, followed on the window, so the drag keeps the pointer once it leaves the row: it lifts the row
 * once `dragStart` says so, then follows it, and drops it on release.
 */
export class RowPress {
  private lifted = false;

  constructor(
    private readonly target: PressTarget,
    private readonly press: WebPressStart,
  ) {
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onCancel);
    // A drag across rows would otherwise select their text.
    window.addEventListener('selectstart', prevent);
  }

  // Puts a lifted row back and stops following the press.
  readonly cancel = (): void => {
    if (this.lifted) this.target.drag.cancel();

    this.end();
  };

  private readonly onMove = (event: PointerEvent): void => {
    if (this.ours(event)) this.moveTo(pointOf(event));
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (this.ours(event)) this.release();
  };

  private readonly onCancel = (event: PointerEvent): void => {
    if (this.ours(event)) this.cancel();
  };

  private ours(event: PointerEvent): boolean {
    return event.pointerId === this.press.pointerId;
  }

  private moveTo(at: Point): void {
    if (this.lifted) this.target.drag.follow(at);
    else this.decide(at);
  }

  private decide(at: Point): void {
    const next = startAt(this.press, at, Date.now());

    if (next === 'scroll') this.end();
    else if (next === 'lift') this.lift(at);
  }

  private lift(at: Point): void {
    const { drag, id, ghost } = this.target;

    this.lifted = true;
    drag.begin(id, ghost, this.press.start);
    drag.follow(at);
  }

  private release(): void {
    if (this.lifted) {
      swallowReleaseClick();
      this.target.drag.finish();
    }

    this.end();
  }

  private end(): void {
    this.lifted = false;
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onCancel);
    window.removeEventListener('selectstart', prevent);
  }
}
