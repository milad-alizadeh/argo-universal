/*
 * Where a moved row lands: the row, the Section it lands in (none for rows outside any), and its index among that
 * Section's rows once moved. Kit-neutral: the Plugin wire schema in `plugins/list-move-props` is checked against it.
 */
export interface ListMove {
  id: string;
  section?: string;
  index: number;
}

// A row as its owner holds it: its id, or a record carrying one.
export type MovableRow = string | { id: string };

// A List's rows as its owner holds them, Section by Section; a Section without an id holds the rows outside any.
export interface MovableSection<Row extends MovableRow> {
  id?: string;
  rows: readonly Row[];
}

const idOf = (row: MovableRow): string =>
  typeof row === 'string' ? row : row.id;

// `target` is the position of the one Section the row lands in.
function landed<Row extends MovableRow, Section extends MovableSection<Row>>(
  sections: readonly Section[],
  row: Row,
  { move, target }: { move: ListMove; target: number },
): Section[] {
  return sections.map((section, position) => {
    const rows = section.rows.filter(
      (candidate) => idOf(candidate) !== move.id,
    );

    if (position === target)
      rows.splice(Math.min(move.index, rows.length), 0, row);

    return { ...section, rows };
  });
}

/*
 * The rows as they read once `move` is made: the row leaves its Section and lands at `index` among the rows of the
 * first Section it names; without a Section, the first Section without an id. It lands in that one Section only, even
 * when two Sections share an id. The List shows this order while its owner answers, and an owner applies the same
 * rule, so the order it draws is the one the List showed. A move naming a row or a Section the rows lack changes
 * nothing.
 */
export function applyListMove<
  Row extends MovableRow,
  Section extends MovableSection<Row>,
>(sections: readonly Section[], move: ListMove): Section[] {
  const row = sections
    .flatMap((section) => section.rows)
    .find((candidate) => idOf(candidate) === move.id);

  const target = sections.findIndex((section) => section.id === move.section);

  if (row === undefined || target < 0) return [...sections];

  return landed(sections, row, { move, target });
}
