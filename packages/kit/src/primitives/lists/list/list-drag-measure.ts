import type { MeasuredRow, MeasuredZone, Rect } from './list-drop-aim';

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

// What draws in a List and measures itself for a drag: its drag layer, rows, Section zones and scrollers.
export interface Registered {
  layer: Measure;
  rows: ReadonlyMap<string, Measure>;
  zones: ReadonlyMap<number, MeasureZone>;
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

type Parts = [
  layer: Rect | undefined,
  source: Rect | undefined,
  rows: [string, Rect][],
  zones: [number, Zone][],
  scrollers: [DragScroller, Rect][],
];

async function measuredParts(
  registry: Registered,
  id: string,
  before: Rect | undefined,
): Promise<Parts> {
  return Promise.all([
    registry.layer(),
    measureRow(registry.rows, id, before),
    measuredEach(registry.rows.entries()),
    measuredEach(registry.zones.entries()),
    measuredEach(
      [...registry.scrollers].map((scroller) => [scroller, scroller.measure]),
    ),
  ]);
}

function assembled(
  layer: Rect,
  source: Rect,
  [, , rows, zones, scrollers]: Parts,
): Measured {
  return {
    layer,
    source,
    rows: rows.map(([id, rect]) => ({ id, rect })),
    zones: zones.map(([section, zone]) => ({ section, ...zone })),
    scrollers: scrollers.map(([scroller, rect]) => ({ scroller, rect })),
  };
}

// Measures the List around lifted row `id`, last measured at `before`; nothing while the drag layer or the row is not drawn.
export async function measureList(
  registry: Registered,
  id: string,
  before: Rect | undefined,
): Promise<Measured | undefined> {
  const parts = await measuredParts(registry, id, before);
  const [layer, source] = parts;

  if (!layer || !source) return;

  return assembled(layer, source, parts);
}
