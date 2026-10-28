import {
  bottom,
  middle,
  type MeasuredRow,
  type Point,
  type Rect,
} from './list-geometry';
import { placeOf, type DropPlace, type MoveSection } from './list-move-model';

// Where a Section starts: a lane's column on a board, or a Section's header in one column. `start` is where its first row goes.
export interface MeasuredZone {
  sectionKey: string;
  rect: Rect;
  start: number;
}

// The insertion line, in the window.
export interface InsertionLine {
  x: number;
  y: number;
  width: number;
}

export interface DropAim {
  place: DropPlace;
  line: InsertionLine;
}

// A List's movable rows by Section, and whether its Sections draw as lanes side by side.
export interface MoveLayout {
  sections: readonly MoveSection[];
  lanes: boolean;
}

export interface AimInput extends MoveLayout {
  zones: readonly MeasuredZone[];
  rows: readonly MeasuredRow[];
  point: Point;
}

interface PlacedRow {
  sectionKey: string;
  index: number;
  rect: Rect;
}

// The measured rows each in its place, and each Section's in order: read once per measurement, not per pointer move.
interface Placed {
  sections: readonly MoveSection[];
  rows: PlacedRow[];
  bySection: Map<string, PlacedRow[]>;
}

const placedBy = new WeakMap<readonly MeasuredRow[], Placed>();

function bySectionOf(rows: readonly PlacedRow[]): Map<string, PlacedRow[]> {
  const bySection = new Map<string, PlacedRow[]>();

  for (const row of rows)
    bySection.set(row.sectionKey, [
      ...(bySection.get(row.sectionKey) ?? []),
      row,
    ]);

  return bySection;
}

function placeRows(
  measured: readonly MeasuredRow[],
  sections: readonly MoveSection[],
): Placed {
  const rows = measured.flatMap(({ id, rect }) => {
    const place = placeOf(sections, id);

    return place ? [{ ...place, rect }] : [];
  });

  rows.sort((a, b) => a.index - b.index);

  const placed = { sections, rows, bySection: bySectionOf(rows) };

  placedBy.set(measured, placed);

  return placed;
}

function placedRows(
  measured: readonly MeasuredRow[],
  sections: readonly MoveSection[],
): Placed {
  const placed = placedBy.get(measured);

  return placed?.sections === sections ? placed : placeRows(measured, sections);
}

const rowsIn = (placed: Placed, sectionKey: string): PlacedRow[] =>
  placed.bySection.get(sectionKey) ?? [];

const horizontalDistance = (rect: Rect, x: number): number =>
  Math.max(rect.x - x, 0, x - (rect.x + rect.width));

// On a board, the lane under the pointer, or the nearest one across.
function laneAt(
  zones: readonly MeasuredZone[],
  { x }: Point,
): string | undefined {
  return [...zones].sort(
    (a, b) => horizontalDistance(a.rect, x) - horizontalDistance(b.rect, x),
  )[0]?.sectionKey;
}

// In one column, the Section of the last header or row that starts above the pointer, else the first.
function sectionAt(
  zones: readonly MeasuredZone[],
  rows: readonly PlacedRow[],
  { y }: Point,
): string | undefined {
  const starts = [...zones, ...rows].sort((a, b) => a.rect.y - b.rect.y);
  const above = starts.filter((start) => start.rect.y <= y);

  return (above.at(-1) ?? starts[0])?.sectionKey;
}

interface Neighbours {
  // The rows either side of where the pointer would land.
  previous: PlacedRow | undefined;
  next: PlacedRow | undefined;
}

// The Section's rows either side of a pointer at `y`, split at the first row whose middle sits below it.
function neighboursAt(rows: readonly PlacedRow[], y: number): Neighbours {
  const nextAt = rows.findIndex((row) => middle(row.rect) > y);

  if (nextAt === -1) return { previous: rows.at(-1), next: undefined };

  return { previous: rows[nextAt - 1], next: rows[nextAt] };
}

const bottomAfter = (previous: PlacedRow, next?: PlacedRow): number =>
  next ? (bottom(previous.rect) + next.rect.y) / 2 : bottom(previous.rect);

// Midway between the rows either side, or against the one there is.
const lineBetween = ({ previous, next }: Neighbours): number | undefined =>
  previous ? bottomAfter(previous, next) : next?.rect.y;

const nearestRect = ({ previous, next }: Neighbours): Rect | undefined =>
  (next ?? previous)?.rect;

// An empty Section draws its line where its first row would go, across the Section.
const lineY = (near: Neighbours, zone?: MeasuredZone): number | undefined =>
  lineBetween(near) ?? zone?.start;

const lineAcross = (near: Neighbours, zone?: MeasuredZone): Rect | undefined =>
  nearestRect(near) ?? zone?.rect;

function lineIn(
  near: Neighbours,
  zone: MeasuredZone | undefined,
): InsertionLine | undefined {
  const across = lineAcross(near, zone);
  const y = lineY(near, zone);

  if (!across || y === undefined) return;

  return { x: across.x, y, width: across.width };
}

const indexAfter = (row?: PlacedRow): number => (row ? row.index + 1 : 0);

const insertionAt = ({ previous, next }: Neighbours): number =>
  next?.index ?? indexAfter(previous);

interface SectionAim {
  sectionKey: string;
  // The Section's rows, in order.
  rows: readonly PlacedRow[];
  zone: MeasuredZone | undefined;
  point: Point;
}

function aimInSection({
  sectionKey,
  rows,
  zone,
  point,
}: SectionAim): DropAim | undefined {
  const near = neighboursAt(rows, point.y);
  const line = lineIn(near, zone);

  if (!line) return;

  return { place: { sectionKey, insertion: insertionAt(near) }, line };
}

// Where a row dragged to `point` would land, and where its insertion line draws; nothing while nothing is measured.
export function aimAt(input: AimInput): DropAim | undefined {
  const placed = placedRows(input.rows, input.sections);

  const sectionKey = input.lanes
    ? laneAt(input.zones, input.point)
    : sectionAt(input.zones, placed.rows, input.point);

  if (sectionKey === undefined) return undefined;

  const zone = input.zones.find((each) => each.sectionKey === sectionKey);
  const rows = rowsIn(placed, sectionKey);

  return aimInSection({ sectionKey, rows, zone, point: input.point });
}
