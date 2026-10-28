import type { ReactNode } from 'react';
import { edgeScroll, slideOffset, type Slide } from './list-drag-rules';
import {
  aimAt,
  type InsertionLine,
  type MeasuredRow,
  type MeasuredZone,
  type Point,
  type Rect,
} from './list-drop-aim';
import {
  landing,
  type DropPlace,
  type ListMove,
  type MoveSection,
} from './list-move-model';

export type Measure = () => Promise<Rect | undefined>;

// Where a Section starts: its lane on a board, or its header in one column, and where its first row goes.
export type MeasureZone = () => Promise<
  { rect: Rect; start: number } | undefined
>;

export interface DragScroller {
  axis: 'x' | 'y';
  measure: Measure;
  scrollBy: (delta: number) => void;
}

// A lifted row, in the drag layer's own coordinates, and where it would land.
export interface DragFrame {
  id: string;
  ghost: ReactNode;
  source: Rect;
  line?: InsertionLine;
  place?: DropPlace;
  // How far each row and each Section header moves aside, where rows slide apart.
  rowSlides: ReadonlyMap<string, number>;
  zoneSlides: ReadonlyMap<number, number>;
}

export interface DragSetup {
  sections: readonly MoveSection[];
  lanes: boolean;
  move: (move: ListMove) => void;
}

interface Lift {
  id: string;
  ghost: ReactNode;
  // Where the pointer took the row: in the window, and from the row's top left once it is measured.
  start: Point;
  grab: Point;
  // Released before the List was measured: it drops as soon as it is.
  released: boolean;
}

interface Measured {
  layer: Rect;
  source: Rect;
  rows: MeasuredRow[];
  zones: MeasuredZone[];
  scrollers: { scroller: DragScroller; rect: Rect }[];
}

type Schedule = (step: () => void) => () => void;

const animationFrames: Schedule = (step) => {
  const frame = requestAnimationFrame(step);

  return () => cancelAnimationFrame(frame);
};

const present = <T>(value: T | undefined): value is T => value !== undefined;

async function measuredEach<Key, Value>(
  entries: Iterable<[Key, () => Promise<Value | undefined>]>,
): Promise<[Key, Value][]> {
  const measured = await Promise.all(
    [...entries].map(async ([key, measure]) => {
      const value = await measure();

      return value === undefined ? undefined : ([key, value] as [Key, Value]);
    }),
  );

  return measured.filter(present);
}

/*
 * One List's drag: rows, Section zones and scrollers register as they draw. A lift measures them all in the window,
 * the pointer aims at a Section and an index there, scrollers under the pointer's edge scroll, and the drop reports
 * the move. Everything it draws is in the drag layer's coordinates.
 */
export class ListDrag {
  private readonly rows = new Map<string, Measure>();
  private readonly zones = new Map<number, MeasureZone>();
  private readonly scrollers = new Set<DragScroller>();
  private readonly listeners = new Set<() => void>();
  private setup: DragSetup = { sections: [], lanes: false, move: () => {} };
  private lift: Lift | undefined;
  private measured: Measured | undefined;
  private point: Point = { x: 0, y: 0 };
  private generation = 0;
  private stopScrolling: (() => void) | undefined;
  private remeasuring = false;
  frame: DragFrame | undefined;

  constructor(
    private readonly layer: Measure,
    private readonly ghostAt: (point: Point) => void,
    private readonly schedule: Schedule = animationFrames,
  ) {}

  configure(setup: DragSetup): void {
    this.setup = setup;
  }

  registerRow(id: string, measure: Measure): () => void {
    this.rows.set(id, measure);

    return () => {
      if (this.rows.get(id) === measure) this.rows.delete(id);
    };
  }

  registerZone(section: number, measure: MeasureZone): () => void {
    this.zones.set(section, measure);

    return () => {
      if (this.zones.get(section) === measure) this.zones.delete(section);
    };
  }

  registerScroller(scroller: DragScroller): () => void {
    this.scrollers.add(scroller);

    return () => this.scrollers.delete(scroller);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  };

  current = (): DragFrame | undefined => this.frame;

  get lifting(): boolean {
    return this.lift !== undefined;
  }

  // Lifts row `id` under the pointer; it draws once its List is measured.
  begin(id: string, ghost: ReactNode, point: Point): void {
    this.end();
    this.generation += 1;
    this.lift = {
      id,
      ghost,
      start: point,
      grab: { x: 0, y: 0 },
      released: false,
    };
    this.point = point;
    void this.measure(this.generation, true);
  }

  follow(point: Point): void {
    this.point = point;
    this.redraw();
  }

  // Drops the row where it aims, reporting the move unless it lands back on its own slot.
  finish(): void {
    const { lift, frame } = this;

    if (lift && !this.measured) {
      lift.released = true;

      return;
    }

    this.end();

    if (!lift || !frame?.place) return;

    const move = landing(this.setup.sections, lift.id, frame.place);

    if (move) this.setup.move(move);
  }

  cancel(): void {
    this.end();
  }

  private end(): void {
    this.generation += 1;
    this.stopScrolling?.();
    this.stopScrolling = undefined;
    this.lift = undefined;
    this.measured = undefined;
    this.remeasuring = false;

    if (this.frame === undefined) return;

    this.frame = undefined;
    this.notify();
  }

  private async measure(generation: number, first: boolean): Promise<void> {
    const lift = this.lift;
    const [layer, source, rows, zones, scrollers] = await Promise.all([
      this.layer(),
      lift ? this.rows.get(lift.id)?.() : undefined,
      measuredEach(this.rows.entries()),
      measuredEach(this.zones.entries()),
      measuredEach([...this.scrollers].map((s) => [s, s.measure] as const)),
    ]);

    if (generation !== this.generation || !lift || !layer) return;

    const kept = source ?? this.measured?.source;

    if (!kept) return this.cancel();

    if (first)
      lift.grab = { x: lift.start.x - kept.x, y: lift.start.y - kept.y };

    this.measured = {
      layer,
      source: kept,
      rows: rows.map(([id, rect]) => ({ id, rect })),
      zones: zones.map(([section, zone]) => ({ section, ...zone })),
      scrollers: scrollers.map(([scroller, rect]) => ({ scroller, rect })),
    };
    this.redraw(true);

    if (lift.released) this.finish();
    else if (first) this.scrollWhileNearEdges(generation);
  }

  private redraw(remeasured = false): void {
    const { lift, measured } = this;

    if (!lift || !measured) return;

    const { layer } = measured;

    this.ghostAt({
      x: this.point.x - lift.grab.x - layer.x,
      y: this.point.y - lift.grab.y - layer.y,
    });

    const aim = aimAt({
      sections: this.setup.sections,
      lanes: this.setup.lanes,
      zones: measured.zones,
      rows: measured.rows,
      point: this.point,
    });
    const slide: Slide = {
      sourceTop: measured.source.y,
      height: measured.source.height,
      lineY: aim?.line.y,
    };
    const next: DragFrame = {
      id: lift.id,
      ghost: lift.ghost,
      source: shifted(measured.source, layer),
      place: aim?.place,
      line: aim && {
        ...aim.line,
        x: aim.line.x - layer.x,
        y: aim.line.y - layer.y,
      },
      rowSlides: new Map(
        measured.rows.map(({ id, rect }) => [id, slideOffset(slide, rect.y)]),
      ),
      zoneSlides: new Map(
        measured.zones.map(({ section, rect }) => [
          section,
          slideOffset(slide, rect.y),
        ]),
      ),
    };

    if (!remeasured && sameFrame(this.frame, next)) return;

    this.frame = next;
    this.notify();
  }

  private scrollWhileNearEdges(generation: number): void {
    const step = (): void => {
      if (generation !== this.generation) return;

      if (this.scrollStep()) this.remeasure(generation);

      this.stopScrolling = this.schedule(step);
    };

    this.stopScrolling = this.schedule(step);
  }

  // Scrolls every scroller the pointer is inside and near an edge of; true when any moved.
  private scrollStep(): boolean {
    let scrolled = false;

    for (const { scroller, rect } of this.measured?.scrollers ?? []) {
      if (!inside(rect, this.point)) continue;

      const delta =
        scroller.axis === 'y'
          ? edgeScroll(this.point.y, rect.y, rect.y + rect.height)
          : edgeScroll(this.point.x, rect.x, rect.x + rect.width);

      if (delta === 0) continue;

      scroller.scrollBy(delta);
      scrolled = true;
    }

    return scrolled;
  }

  // Rows move as their scroller scrolls, so they are measured again, one measurement at a time.
  private remeasure(generation: number): void {
    if (this.remeasuring) return;

    this.remeasuring = true;
    void this.measure(generation, false).finally(() => {
      if (generation === this.generation) this.remeasuring = false;
    });
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

const shifted = (rect: Rect, by: Point): Rect => ({
  ...rect,
  x: rect.x - by.x,
  y: rect.y - by.y,
});

const inside = (rect: Rect, { x, y }: Point): boolean =>
  x >= rect.x &&
  x <= rect.x + rect.width &&
  y >= rect.y &&
  y <= rect.y + rect.height;

function sameFrame(a: DragFrame | undefined, b: DragFrame): boolean {
  return (
    a !== undefined &&
    a.id === b.id &&
    a.place?.section === b.place?.section &&
    a.place?.insertion === b.place?.insertion &&
    a.line?.x === b.line?.x &&
    a.line?.y === b.line?.y &&
    a.line?.width === b.line?.width
  );
}
