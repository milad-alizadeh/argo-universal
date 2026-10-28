import type { MeasuredZone } from './list-drop-aim';
import type { MeasuredRow, Rect } from './list-geometry';
import { registered } from './list-registered';

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

export interface MeasuredScroller {
  scroller: DragScroller;
  rect: Rect;
}

// The List as a lift measured it, in the window.
export interface Measured {
  layer: Rect;
  source: Rect;
  rows: MeasuredRow[];
  zones: MeasuredZone[];
  scrollers: MeasuredScroller[];
}

interface Registered {
  layer: Measure;
  rows: ReadonlyMap<string, Measure>;
  zones: ReadonlyMap<string, MeasureZone>;
  scrollers: ReadonlySet<DragScroller>;
}

// Measures every entry at once, leaving out the ones not drawn.
async function measuredEach<Key, Value>(
  entries: Iterable<[Key, () => Promise<Value | undefined>]>,
): Promise<[Key, Value][]> {
  const measured = await Promise.all(
    [...entries].map(async ([key, measure]): Promise<[Key, Value][]> => {
      const value = await measure();

      return value === undefined ? [] : [[key, value]];
    }),
  );

  return measured.flat();
}

// A row scrolled out of a virtualised List is no longer drawn, so the lift keeps where it was last measured.
async function measureRow(
  rows: ReadonlyMap<string, Measure>,
  id: string,
  before: Rect | undefined,
): Promise<Rect | undefined> {
  return (await rows.get(id)?.()) ?? before;
}

type Zone = NonNullable<Awaited<ReturnType<MeasureZone>>>;

// What each registered view measured; the layer and the lifted row are missing while they are not drawn.
interface Parts {
  layer: Rect | undefined;
  source: Rect | undefined;
  rows: [string, Rect][];
  zones: [string, Zone][];
  scrollers: [DragScroller, Rect][];
}

const scrollerMeasures = (
  scrollers: Iterable<DragScroller>,
): [DragScroller, Measure][] =>
  [...scrollers].map((scroller) => [scroller, scroller.measure]);

async function measuredParts(
  registry: Registered,
  id: string,
  before: Rect | undefined,
): Promise<Parts> {
  const [layer, source, rows, zones, scrollers] = await Promise.all([
    registry.layer(),
    measureRow(registry.rows, id, before),
    measuredEach(registry.rows.entries()),
    measuredEach(registry.zones.entries()),
    measuredEach(scrollerMeasures(registry.scrollers)),
  ]);

  return { layer, source, rows, zones, scrollers };
}

function assembled(
  layer: Rect,
  source: Rect,
  { rows, zones, scrollers }: Parts,
): Measured {
  return {
    layer,
    source,
    rows: rows.map(([id, rect]) => ({ id, rect })),
    zones: zones.map(([sectionKey, zone]) => ({ sectionKey, ...zone })),
    scrollers: scrollers.map(([scroller, rect]) => ({ scroller, rect })),
  };
}

// Measures the List around lifted row `id`, last measured at `before`; nothing while the drag layer or the row is not drawn.
async function measureList(
  registry: Registered,
  id: string,
  before: Rect | undefined,
): Promise<Measured | undefined> {
  const parts = await measuredParts(registry, id, before);
  const { layer, source } = parts;

  if (!layer || !source) return;

  return assembled(layer, source, parts);
}

// A press on a row, and the List measured around it once the measurement lands.
interface Pressed {
  id: string;
  measured?: Measured;
}

// What draws in one List and measures itself for a drag: its drag layer, rows, Section zones and scrollers.
export class DragRegistry {
  private readonly rows = new Map<string, Measure>();
  private readonly zones = new Map<string, MeasureZone>();
  private readonly scrollers = new Set<DragScroller>();
  private pressed: Pressed | undefined;

  public constructor(private readonly layer: Measure) {}

  public registerRow(id: string, measure: Measure): () => void {
    return registered(this.rows, id, measure);
  }

  public registerZone(sectionKey: string, measure: MeasureZone): () => void {
    return registered(this.zones, sectionKey, measure);
  }

  public registerScroller(scroller: DragScroller): () => void {
    this.scrollers.add(scroller);

    return (): boolean => this.scrollers.delete(scroller);
  }

  // Measures the List around row `id` as a press on it begins, so a lift from that press draws from its first move.
  public prepare(id: string): void {
    const pressed: Pressed = { id };

    this.pressed = pressed;
    void this.measureAround(id).then((measured) => {
      pressed.measured = measured;
    });
  }

  // The List as the press on row `id` measured it, once; none while that measurement is still on its way.
  public measuredPress(id: string): Measured | undefined {
    const pressed = this.pressed;

    this.pressed = undefined;

    return pressed?.id === id ? pressed.measured : undefined;
  }

  public measureAround(
    id: string,
    before?: Rect,
  ): Promise<Measured | undefined> {
    const { layer, rows, zones, scrollers } = this;

    return measureList({ layer, rows, zones, scrollers }, id, before);
  }
}
