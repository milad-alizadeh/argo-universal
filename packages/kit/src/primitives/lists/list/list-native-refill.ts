import type { MoveSection, RowId } from './list-move-model';
import type { NativeRow, NativeSection } from './list-native-sections';

// The move Section a native section's rows move in: the one named by its id, or the rows outside any Section.
const movedIn = (
  section: NativeSection,
  moves: readonly MoveSection[],
): MoveSection | undefined =>
  section.loose || section.id !== undefined
    ? moves.find((move) => move.id === section.id)
    : undefined;

interface Refill {
  movable: ReadonlySet<RowId>;
  rows: ReadonlyMap<RowId, NativeRow>;
}

// Where a native section takes its rows from: its move Section, from which row, and whether it takes the rest.
interface Source {
  move: MoveSection;
  from: number;
  last: boolean;
}

const placed = (refill: Refill, id: RowId | undefined): NativeRow[] => {
  const row = id === undefined ? undefined : refill.rows.get(id);

  return row ? [{ ...row, moveId: row.id }] : [];
};

const placedAll = (refill: Refill, ids: readonly RowId[]): NativeRow[] =>
  ids.flatMap((id) => placed(refill, id));

const isMovable = (refill: Refill, row: NativeRow): boolean =>
  row.id !== undefined && refill.movable.has(row.id);

const slotsIn = (refill: Refill, section: NativeSection): NativeRow[] =>
  section.rows.filter((row) => isMovable(refill, row));

/*
 * A native section's movable slots take its move Section's rows from `from` on, in order; any other row keeps its
 * place. The last native section of a move Section takes the rows left after its slots.
 */
function refilled(
  refill: Refill,
  section: NativeSection,
  { move, from, last }: Source,
): NativeSection {
  const slots = slotsIn(refill, section);
  const taken = new Map(slots.map((slot, n) => [slot, move.rows[from + n]]));

  const rows = section.rows.flatMap((row) =>
    taken.has(row) ? placed(refill, taken.get(row)) : [row],
  );

  const rest = last ? move.rows.slice(from + slots.length) : [];

  return { ...section, rows: [...rows, ...placedAll(refill, rest)] };
}

function refillOf(
  sections: NativeSection[],
  moves: readonly MoveSection[],
): Refill {
  const rows = sections.flatMap((section) => section.rows);

  return {
    movable: new Set(moves.flatMap((move) => move.rows)),
    rows: new Map(
      rows.flatMap((row) => (row.id === undefined ? [] : [[row.id, row]])),
    ),
  };
}

// How many slots the native sections before one took from `move`.
const slotsBefore = (
  before: (MoveSection | undefined)[],
  slots: number[],
  move: MoveSection,
): number =>
  before.reduce(
    (sum, each, at) => (each === move ? sum + (slots[at] ?? 0) : sum),
    0,
  );

interface Taken {
  targets: (MoveSection | undefined)[];
  // How many movable slots each native section has.
  slots: number[];
}

const sourceAt = (
  { targets, slots }: Taken,
  index: number,
  move: MoveSection,
): Source => ({
  move,
  from: slotsBefore(targets.slice(0, index), slots, move),
  last: targets.lastIndexOf(move) === index,
});

// Each native section's source: the slots the native sections before it took from the same move Section.
function sourcesOf(
  refill: Refill,
  sections: NativeSection[],
  targets: (MoveSection | undefined)[],
): (Source | undefined)[] {
  const slots = sections.map((section) => slotsIn(refill, section).length);

  return targets.map((move, index) =>
    move === undefined ? undefined : sourceAt({ targets, slots }, index, move),
  );
}

/*
 * The native sections in the order `moves` shows: each Section's movable rows in that order, a moved row in the Section
 * it moved to. Rows the List cannot move keep their places.
 */
export function refilledSections(
  sections: NativeSection[],
  moves: readonly MoveSection[],
): NativeSection[] {
  const refill = refillOf(sections, moves);
  const targets = sections.map((section) => movedIn(section, moves));
  const sources = sourcesOf(refill, sections, targets);

  return sections.map((section, index) => {
    const source = sources[index];

    return source ? refilled(refill, section, source) : section;
  });
}
