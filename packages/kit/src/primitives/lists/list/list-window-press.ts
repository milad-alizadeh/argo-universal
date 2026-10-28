import type { PressStart } from './list-drag-rules';
import type { Point } from './list-geometry';
import { RowPress, type PressTarget } from './list-row-press';

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

// A `touchmove` listener that may cancel the page's scroll must say it is not passive.
const blocking = { passive: false } as const;

/*
 * The web's adapter for a RowPress: the window follows the press, so the drag keeps the pointer once it leaves the
 * row.
 *
 * A finger works as on the phones: a swipe before the hold ends is the page's scroll, which cancels the press, and
 * once the hold ends its moves no longer scroll, so they lift the row. The rows keep the browser's own `touch-action`,
 * which the browser reads as the touch begins, so a quick swipe still scrolls; a held finger's `touchmove` is
 * cancelled instead (https://developer.mozilla.org/docs/Web/API/Touch_events/Using_Touch_Events).
 */
export class WindowPress {
  private readonly press: RowPress;

  public constructor(
    target: PressTarget,
    private readonly start: WebPressStart,
  ) {
    this.press = new RowPress(target, start);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onCancel);
    window.addEventListener('touchmove', this.onTouchMove, blocking);
    // A drag across rows would otherwise select their text.
    window.addEventListener('selectstart', prevent);
  }

  // Puts a lifted row back and stops following the press.
  public readonly cancel = (): void => {
    this.press.cancel();
    this.end();
  };

  private readonly onMove = (event: PointerEvent): void => {
    if (this.ours(event)) this.moveTo(pointOf(event));
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (!this.ours(event)) return;

    if (this.press.release()) swallowReleaseClick();

    this.end();
  };

  private readonly onCancel = (event: PointerEvent): void => {
    if (this.ours(event)) this.cancel();
  };

  private readonly onTouchMove = (event: TouchEvent): void => {
    if (this.press.holds(Date.now())) event.preventDefault();
  };

  private ours(event: PointerEvent): boolean {
    return event.pointerId === this.start.pointerId;
  }

  private moveTo(at: Point): void {
    const step = this.press.move(at, Date.now());

    if (step === 'scroll') this.end();
    // A held finger would otherwise open the row's context menu under the lifted row.
    else if (step === 'lift')
      window.addEventListener('contextmenu', swallow, true);
  }

  private end(): void {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onCancel);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('contextmenu', swallow, true);
    window.removeEventListener('selectstart', prevent);
  }
}
