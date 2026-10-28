import { placeOf, type DropPlace, type MoveSection } from './list-move-model';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

// A drawn row, measured in the window.
export interface MeasuredRow {
  id: string;
  rect: Rect;
}

// Where a Section starts: a lane's column on a board, or a Section's header in one column. `start` is where its first row goes.
export interface MeasuredZone {
  section: number;
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

export interface AimInput {
  sections: readonly MoveSection[];
  lanes: boolean;
  zones: readonly MeasuredZone[];
  rows: readonly MeasuredRow[];
  point: Point;
}

interface PlacedRow {
  section: number;
  index: number;
  rect: Rect;
}

const bottom = (rect: Rect): number => rect.y + rect.height;

const middle = (rect: Rect): number => rect.y + rect.height / 2;

function placedRows(input: AimInput): PlacedRow[] {
  return input.rows.flatMap(({ id, rect }) => {
    const place = placeOf(input.sections, id);

    return place ? [{ section: place.section, index: place.index, rect }] : [];
  });
}

const horizontalDistance = (rect: Rect, x: number): number =>
  Math.max(rect.x - x, 0, x - (rect.x + rect.width));

// On a board, the lane under the pointer, or the nearest one across.
function laneAt(
  zones: readonly MeasuredZone[],
  { x }: Point,
): number | undefined {
  const nearest = zones.toSorted(
    (a, b) => horizontalDistance(a.rect, x) - horizontalDistance(b.rect, x),
  )[0];

  return nearest?.section;
}

// In one column, the Section of the last header or row that starts above the pointer, else the first.
function sectionAt(
  zones: readonly MeasuredZone[],
  rows: readonly PlacedRow[],
  { y }: Point,
): number | undefined {
  const starts = [...zones, ...rows].toSorted((a, b) => a.rect.y - b.rect.y);
  const above = starts.filter((start) => start.rect.y <= y);

  return (above.at(-1) ?? starts[0])?.section;
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

const rectOf = (drawn?: { rect: Rect }): Rect | undefined => drawn?.rect;

const startOf = (zone?: MeasuredZone): number | undefined => zone?.start;

const nearest = ({ previous, next }: Neighbours): PlacedRow | undefined =>
  next ?? previous;

// An empty Section draws its line where its first row would go, across the Section.
const lineY = (near: Neighbours, zone?: MeasuredZone): number | undefined =>
  lineBetween(near) ?? startOf(zone);

const lineAcross = (near: Neighbours, zone?: MeasuredZone): Rect | undefined =>
  rectOf(nearest(near)) ?? rectOf(zone);

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
  section: number;
  rows: readonly PlacedRow[];
  zone: MeasuredZone | undefined;
  point: Point;
}

const rowsOf = (rows: readonly PlacedRow[], section: number): PlacedRow[] =>
  rows
    .filter((row) => row.section === section)
    .toSorted((a, b) => a.index - b.index);

function aimInSection({
  section,
  rows,
  zone,
  point,
}: SectionAim): DropAim | undefined {
  const near = neighboursAt(rowsOf(rows, section), point.y);
  const line = lineIn(near, zone);

  if (!line) return;

  return { place: { section, insertion: insertionAt(near) }, line };
}

// Where a row dragged to `point` would land, and where its insertion line draws; nothing while nothing is measured.
export function aimAt(input: AimInput): DropAim | undefined {
  const rows = placedRows(input);

  const section = input.lanes
    ? laneAt(input.zones, input.point)
    : sectionAt(input.zones, rows, input.point);

  if (section === undefined) return undefined;

  const zone = input.zones.find((candidate) => candidate.section === section);

  return aimInSection({ section, rows, zone, point: input.point });
}
