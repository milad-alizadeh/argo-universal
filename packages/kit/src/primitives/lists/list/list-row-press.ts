import type { ReactNode, RefObject } from 'react';
import type { ViewInstance } from 'react-native';
import type { ListDrag } from './list-drag-controller';
import { holdToLift, startAt, type PressStart } from './list-drag-rules';
import type { Point } from './list-geometry';

// The part of a List's drag a press drives.
export type PressDrag = Pick<
  ListDrag,
  'prepare' | 'begin' | 'follow' | 'finish' | 'cancel'
>;

// What a press drags: row `id` of a List's drag, drawn as `ghost` once lifted.
export interface PressTarget {
  drag: PressDrag;
  id: string;
  ghost: ReactNode;
}

// What a press does at a move: waits, lifts the row, follows the lifted row, or leaves the touch to the List's scroll.
export type PressStep = 'wait' | 'lift' | 'follow' | 'scroll';

// A press begun at `start` now: a mouse drags at once, and a finger or pen holds the row first, as on the phones.
export const pressStart = (start: Point, mouse: boolean): PressStart => ({
  start,
  at: Date.now(),
  pointer: mouse ? 'mouse' : 'touch',
});

type PressState = 'pressed' | 'lifted' | 'ended';

/*
 * One press on a row, as either platform reports it: it waits until the press lifts the row or scrolls the List,
 * lifts the row from where the press began, follows it, and drops it on release. The List is measured as the press
 * begins, so a lifted row follows the pointer from its first move.
 */
export class RowPress {
  private state: PressState = 'pressed';

  public constructor(
    private readonly target: PressTarget,
    private readonly press: PressStart,
  ) {
    target.drag.prepare(target.id);
  }

  public get lifted(): boolean {
    return this.state === 'lifted';
  }

  // A lifted row, or a finger held long enough to lift it, keeps its moves from the page's scroll.
  public holds(now: number): boolean {
    return this.lifted || now - this.press.at >= holdToLift;
  }

  public move(at: Point, now: number): PressStep {
    if (this.lifted) {
      this.target.drag.follow(at);

      return 'follow';
    }

    return this.state === 'ended' ? 'wait' : this.decide(at, now);
  }

  // Drops a lifted row where it aims; says whether one was lifted.
  public release(): boolean {
    const lifted = this.lifted;

    if (lifted) this.target.drag.finish();

    this.state = 'ended';

    return lifted;
  }

  public cancel(): void {
    if (this.lifted) this.target.drag.cancel();

    this.state = 'ended';
  }

  private decide(at: Point, now: number): PressStep {
    const next = startAt(this.press, at, now);

    if (next === 'scroll') this.state = 'ended';

    if (next === 'lift') this.lift(at);

    return next;
  }

  private lift(at: Point): void {
    const { drag, id, ghost } = this.target;

    this.state = 'lifted';
    drag.begin(id, ghost, this.press.start);
    drag.follow(at);
  }
}

// The view a movable row draws in, which turns a press on it into a drag of row `id`, drawn as `ghost` once lifted.
export interface RowDragProps extends PressTarget {
  // The row's resting view, which the drag measures.
  viewRef: RefObject<ViewInstance | null>;
  children: ReactNode;
}
