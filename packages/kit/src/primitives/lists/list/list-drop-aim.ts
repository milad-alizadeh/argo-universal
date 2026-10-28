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

    return place ? [{ ...place, rect }] : [];
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

function lineBetween(
  previous: PlacedRow | undefined,
  next: PlacedRow | undefined,
): number | undefined {
  if (previous && next) return (bottom(previous.rect) + next.rect.y) / 2;

  return next?.rect.y ?? (previous ? bottom(previous.rect) : undefined);
}

function aimInSection(
  section: number,
  rows: readonly PlacedRow[],
  zone: MeasuredZone | undefined,
  { y }: Point,
): DropAim | undefined {
  const own = rows
    .filter((row) => row.section === section)
    .toSorted((a, b) => a.index - b.index);
  const nextAt = own.findIndex((row) => middle(row.rect) > y);
  const next = nextAt === -1 ? undefined : own[nextAt];
  const previous = nextAt === -1 ? own.at(-1) : own[nextAt - 1];
  const insertion = next?.index ?? (previous ? previous.index + 1 : 0);
  const across = (next ?? previous)?.rect ?? zone?.rect;
  const lineY = lineBetween(previous, next) ?? zone?.start;

  if (!across || lineY === undefined) return undefined;

  return {
    place: { section, insertion },
    line: { x: across.x, y: lineY, width: across.width },
  };
}

// Where a row dragged to `point` would land, and where its insertion line draws; nothing while nothing is measured.
export function aimAt(input: AimInput): DropAim | undefined {
  const rows = placedRows(input);
  const section = input.lanes
    ? laneAt(input.zones, input.point)
    : sectionAt(input.zones, rows, input.point);

  if (section === undefined) return undefined;

  const zone = input.zones.find((candidate) => candidate.section === section);

  return aimInSection(section, rows, zone, input.point);
}
