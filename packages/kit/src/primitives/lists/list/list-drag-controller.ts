import type { ReactNode } from 'react';
import { listenerSet } from '../../../listener-set';
import {
  dragFrame,
  ghostPoint,
  grabOf,
  landedMove,
  sameFrame,
  type DragDrawing,
  type DragFrame,
  type DragOrder,
  type Lift,
} from './list-drag-frame';
import {
  DragRegistry,
  type DragScroller,
  type Measure,
  type Measured,
  type MeasuredScroller,
  type MeasureZone,
  sourceOf,
} from './list-drag-measure';
import { scrollEdges } from './list-edge-scroll';
import { FrameLoop } from './list-frame-loop';
import type { Point } from './list-geometry';
import type { RowId, SectionKey } from './list-move-model';

/*
 * One List's drag: rows, Section zones and scrollers register as they draw. A lift measures them all in the window,
 * the pointer aims at a Section and an index there, scrollers under the pointer's edge scroll, and the drop reports
 * the move. Everything it draws is in the drag layer's coordinates.
 */
export class ListDrag {
  private readonly registry: DragRegistry;
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
    this.registry = new DragRegistry(layer);
    this.scrolling = new FrameLoop(drawing.schedule);
  }

  public readonly current = (): DragFrame | undefined => this.frame;

  // Rows, Section zones (a header or a lane) and edge scrollers register as they draw; each returns its unregister.
  public registerRow(id: RowId, measure: Measure): () => void {
    return this.registry.registerRow(id, measure);
  }

  public registerZone(
    sectionKey: SectionKey,
    measure: MeasureZone,
  ): () => void {
    return this.registry.registerZone(sectionKey, measure);
  }

  public registerScroller(scroller: DragScroller): () => void {
    return this.registry.registerScroller(scroller);
  }

  // Measures the List around row `id` as a press on it begins.
  public prepare(id: RowId): void {
    this.registry.prepare(id);
  }

  // Lifts row `id` under the pointer; it draws at once when its press was measured, else once its List is.
  public begin(id: RowId, ghost: ReactNode, point: Point): void {
    const ready = this.registry.measuredPress(id);

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
    const move = landedMove(this.order.sections, this.frame);

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
    const measured = await this.registry.measureAround(lift.id, last);

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
