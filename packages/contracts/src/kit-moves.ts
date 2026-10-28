import type { ListMove } from './plugins/list-move-props';

export type { ListMove };

// A row as its owner holds it: its id, or a record carrying one.
export type MovableRow = string | { id: string };

// A List's rows as its owner holds them, Section by Section; a Section without an id holds the rows outside any.
export interface MovableSection<Row extends MovableRow> {
  id?: string;
  rows: readonly Row[];
}

const idOf = (row: MovableRow): string =>
  typeof row === 'string' ? row : row.id;

function landed<Row extends MovableRow, Section extends MovableSection<Row>>(
  sections: readonly Section[],
  row: Row,
  move: ListMove,
): Section[] {
  return sections.map((section) => {
    const rows = section.rows.filter(
      (candidate) => idOf(candidate) !== move.id,
    );

    if (section.id === move.section)
      rows.splice(Math.min(move.index, rows.length), 0, row);

    return { ...section, rows };
  });
}

/*
 * The rows as they read once `move` is made: the row leaves its Section and lands at `index` among the rows of the
 * Section it names. The List shows this order while its owner answers, and an owner applies the same rule, so the
 * order it draws is the one the List showed. A move naming a row or a Section the rows lack changes nothing.
 */
export function applyListMove<
  Row extends MovableRow,
  Section extends MovableSection<Row>,
>(sections: readonly Section[], move: ListMove): Section[] {
  const row = sections
    .flatMap((section) => section.rows)
    .find((candidate) => idOf(candidate) === move.id);

  const target = sections.some((section) => section.id === move.section);

  if (row === undefined || !target) return [...sections];

  return landed(sections, row, move);
}
