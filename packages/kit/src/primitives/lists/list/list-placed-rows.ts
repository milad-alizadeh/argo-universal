import type { MeasuredRow, Rect } from './list-geometry';
import { placeOf, type MoveSection } from './list-move-model';

export interface PlacedRow {
  sectionKey: string;
  index: number;
  rect: Rect;
}

// The measured rows each in its place, and each Section's in order: read once per measurement, not per pointer move.
export interface Placed {
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

export function placedRows(
  measured: readonly MeasuredRow[],
  sections: readonly MoveSection[],
): Placed {
  const placed = placedBy.get(measured);

  return placed?.sections === sections ? placed : placeRows(measured, sections);
}

// A Section's rows, in order.
export const rowsIn = (placed: Placed, sectionKey: string): PlacedRow[] =>
  placed.bySection.get(sectionKey) ?? [];
