import type { ReactNode } from 'react';
import { listenerSet } from '../../../listener-set';
import {
  dragFrame,
  ghostPoint,
  grabOf,
  landedMove,
  sameFrame,
  type DragFrame,
  type DragOrder,
  type LiftedRow,
} from './list-drag-frame';
import {
  DragRegistry,
  type Measure,
  type Measured,
  type MeasuredScroller,
} from './list-drag-measure';
import { FrameLoop, scrollEdges, type Schedule } from './list-drag-rules';
import type { Point, Rect } from './list-geometry';

interface Lift extends LiftedRow {
  // Where the pointer took the row, in the window.
  start: Point;
  // Released before the List was measured: it drops as soon as it is.
  released: boolean;
}

const sourceOf = (measured?: Measured): Rect | undefined => measured?.source;

// How a drag draws: where its lifted copy goes, whether rows slide apart, and when its frames run.
export interface DragDrawing {
  ghostAt: (point: Point) => void;
  slides: boolean;
  schedule?: Schedule;
}

/*
 * One List's drag: rows, Section zones and scrollers register as they draw. A lift measures them all in the window,
 * the pointer aims at a Section and an index there, scrollers under the pointer's edge scroll, and the drop reports
 * the move. Everything it draws is in the drag layer's coordinates.
 */
export class ListDrag extends DragRegistry {
  private readonly listeners = listenerSet();
  public readonly subscribe = this.listeners.subscribe;
  private lift: Lift | undefined;
  private measured: Measured | undefined;
  private point: Point = { x: 0, y: 0 };
  private generation = 0;
  private readonly scrolling: FrameLoop;
  private remeasuring = false;
  private frame: DragFrame | undefined;

  public constructor(
    layer: Measure,
    private readonly order: DragOrder,
    private readonly drawing: DragDrawing,
  ) {
    super(layer);
    this.scrolling = new FrameLoop(drawing.schedule);
  }

  public readonly current = (): DragFrame | undefined => this.frame;

  // Lifts row `id` under the pointer; it draws at once when its press was measured, else once its List is.
  public begin(id: string, ghost: ReactNode, point: Point): void {
    const ready = this.measuredPress(id);

    this.end();
    this.generation += 1;
    this.lift = { id, ghost, start: point, grab: point, released: false };
    this.point = point;

    if (ready) this.measuredAs(this.lift, ready, true);
    else void this.measure(this.generation, true);
  }

  public follow(point: Point): void {
    this.point = point;
    this.redraw(false);
  }

  // Drops the row where it aims, reporting the move unless it lands back on its own slot; before the List is measured, as soon as it is.
  public finish(): void {
    if (this.lift && !this.measured) this.lift.released = true;
    else this.drop();
  }

  public readonly cancel = (): void => this.end();

  private get measuredScrollers(): readonly MeasuredScroller[] {
    return this.measured?.scrollers ?? [];
  }

  private drop(): void {
    const move = landedMove(this.order, this.frame);

    this.end();

    if (move) this.order.move(move);
  }

  private end(): void {
    this.generation += 1;
    this.scrolling.stop();
    this.lift = undefined;
    this.measured = undefined;
    this.remeasuring = false;
    this.draw();
  }

  private async measure(generation: number, first: boolean): Promise<void> {
    const lift = this.lift;

    if (!lift) return;

    const last = sourceOf(this.measured);
    const measured = await this.measureAround(lift.id, last);

    if (generation === this.generation) this.measuredAs(lift, measured, first);
  }

  private measuredAs(
    lift: Lift,
    measured: Measured | undefined,
    first: boolean,
  ): void {
    if (!measured) return this.cancel();

    if (first) lift.grab = grabOf(lift.start, measured.source);

    this.measured = measured;
    this.redraw(true);
    this.afterMeasure(lift, first);
  }

  private afterMeasure(lift: Lift, first: boolean): void {
    if (lift.released) this.drop();
    else if (first) this.scrollWhileNearEdges(this.generation);
  }

  private redraw(remeasured: boolean): void {
    const { lift, measured } = this;

    if (lift && measured) this.drawAt(lift, measured, remeasured);
  }

  private drawAt(lift: Lift, measured: Measured, remeasured: boolean): void {
    const { point, order } = this;
    const { ghostAt, slides } = this.drawing;

    ghostAt(ghostPoint(point, lift, measured.layer));

    const next = dragFrame({ lift, measured, point, order, slides });

    if (remeasured || !sameFrame(this.frame, next)) this.draw(next);
  }

  private draw(frame?: DragFrame): void {
    if (frame === this.frame) return;

    this.frame = frame;

    this.listeners.notify();
  }

  // Each frame of the lift, scrolls the scrollers whose edge the pointer nears.
  private scrollWhileNearEdges(generation: number): void {
    this.scrolling.start(() => {
      if (scrollEdges(this.measuredScrollers, this.point))
        this.remeasure(generation);
    });
  }

  // Rows move as their scroller scrolls, so they are measured again, one measurement at a time.
  private remeasure(generation: number): void {
    if (this.remeasuring) return;

    this.remeasuring = true;
    void this.measure(generation, false).finally(() => {
      if (generation === this.generation) this.remeasuring = false;
    });
  }
}
