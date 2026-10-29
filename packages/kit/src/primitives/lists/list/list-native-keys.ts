import type { RowId } from './list-move-model';
import type { NativeRow, NativeSection } from './list-native-sections';

// The first row to carry each id, which keeps that id as its key.
const firstById = (sections: NativeSection[]): Map<RowId, NativeRow> =>
  sections
    .flatMap((section) => section.rows)
    .reduce(
      (first, row) =>
        row.id === undefined || first.has(row.id)
          ? first
          : new Map(first).set(row.id, row),
      new Map<RowId, NativeRow>(),
    );

const ownsId = (first: Map<RowId, NativeRow>, row: NativeRow): boolean =>
  row.id !== undefined && first.get(row.id) === row;

const keyedBy =
  (first: Map<RowId, NativeRow>) =>
  (section: NativeSection): NativeSection => ({
    ...section,
    rows: section.rows.map((row) => ({
      ...row,
      key: ownsId(first, row) ? `row/${row.id}` : `${section.key}/${row.key}`,
    })),
  });

/*
 * In a List with `onMove` a row keeps one key wherever it draws, as a LegendList's rows do (list-level-entries): its id,
 * or, without one or for a repeated id, its place in the Section it is written in. A moved row so never shares a key
 * with the rows of the Section it lands in.
 */
export const withMovingKeys = (sections: NativeSection[]): NativeSection[] =>
  sections.map(keyedBy(firstById(sections)));
