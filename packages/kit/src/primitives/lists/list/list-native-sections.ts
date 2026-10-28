import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import { isSection } from './list-level-entries';
import {
  rowId,
  sectionIdOf,
  type MoveSection,
  type RowId,
  type SectionId,
} from './list-move-model';

/*
 * What a native grouped List draws: sections of FieldGroup rows (list-native-props). A row is only a function
 * that makes its element, so the native list mounts the rows near the viewport. In a List with `onMove`, a row the
 * List can move carries its `moveId`.
 */
export type NativeRow = {
  key: string;
  // The row's own `id`.
  id?: RowId;
  moveId?: RowId;
  render: () => ReactElement;
};

export type NativeSection = {
  key: string;
  // The List.Section's own `id`; a run of rows outside any Section is `loose` instead.
  id?: SectionId;
  loose?: true;
  title?: string;
  footer?: string;
  rows: NativeRow[];
};

type RowElement = ReactElement<{ id?: unknown }>;

const isRow = (node: ReactNode): node is RowElement => isValidElement(node);

const ownId = ({ props }: RowElement): RowId | undefined =>
  typeof props.id === 'string' ? rowId(props.id) : undefined;

const elementRow = (element: RowElement, index: number): NativeRow => ({
  key: String(element.key ?? index),
  id: ownId(element),
  render: () => element,
});

const rowsOf = (nodes: ReactNode): NativeRow[] =>
  flattenedChildren(nodes).filter(isRow).map(elementRow);

const startsRun = (child: ReactNode, last: ReactNode[] | undefined): boolean =>
  isSection(child) || last === undefined || isSection(last[0]);

// A Section is a run of its own; the loose rows between Sections make runs of theirs.
function addChild(runs: ReactNode[][], child: ReactNode): ReactNode[][] {
  const last = runs.at(-1);

  if (last !== undefined && !startsRun(child, last)) last.push(child);
  else runs.push([child]);

  return runs;
}

function toSection(run: ReactNode[], index: number): NativeSection {
  const [first] = run;

  if (!isSection(first))
    return { key: `rows-${index}`, loose: true, rows: rowsOf(run) };

  const { id, title, footer, children } = first.props;

  return {
    key: String(first.key ?? index),
    id: sectionIdOf(id),
    title,
    footer,
    rows: rowsOf(children),
  };
}

const hasRows = (section: NativeSection): boolean => section.rows.length > 0;

// Every Section and run of loose rows, those without rows too.
const allSections = (children: ReactNode): NativeSection[] =>
  flattenedChildren(children)
    .reduce<ReactNode[][]>(addChild, [])
    .map(toSection);

export const nativeSections = (children: ReactNode): NativeSection[] =>
  allSections(children).filter(hasRows);

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
  // Each move Section's rows not yet placed, in the order shown.
  left: Map<MoveSection, RowId[]>;
}

const placed = (refill: Refill, id: RowId): NativeRow[] => {
  const row = refill.rows.get(id);

  return row ? [{ ...row, moveId: id }] : [];
};

const isMovable = (refill: Refill, row: NativeRow): boolean =>
  row.id !== undefined && refill.movable.has(row.id);

// A slot the List can move takes the next row its move Section shows; any other row keeps its place.
function slotRows(refill: Refill, row: NativeRow, left: RowId[]): NativeRow[] {
  if (!isMovable(refill, row)) return [row];

  const id = left.shift();

  return id === undefined ? [] : placed(refill, id);
}

// A native section's movable slots take the next of its move Section's rows; its last native section takes the rest.
function refilled(
  section: NativeSection,
  move: MoveSection,
  { refill, last }: { refill: Refill; last: boolean },
): NativeSection {
  const left = refill.left.get(move) ?? [];

  const rows = section.rows.flatMap((row) => slotRows(refill, row, left));

  const rest = last ? left.splice(0).flatMap((id) => placed(refill, id)) : [];

  return { ...section, rows: [...rows, ...rest] };
}

const rowEntries = (row: NativeRow): (readonly [RowId, NativeRow])[] =>
  row.id === undefined ? [] : [[row.id, row]];

function refillOf(
  sections: NativeSection[],
  moves: readonly MoveSection[],
): Refill {
  const rows = sections.flatMap((section) => section.rows);

  return {
    movable: new Set(moves.flatMap((move) => move.rows)),
    rows: new Map(rows.flatMap(rowEntries)),
    left: new Map(moves.map((move) => [move, [...move.rows]])),
  };
}

// Each native section as shown: refilled from the move Section it maps to, the last one for it taking the rest.
const shownBy =
  (refill: Refill, targets: (MoveSection | undefined)[]) =>
  (section: NativeSection, index: number): NativeSection => {
    const move = targets[index];

    if (move === undefined) return section;

    const last = targets.lastIndexOf(move) === index;

    return refilled(section, move, { refill, last });
  };

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
const withMovingKeys = (sections: NativeSection[]): NativeSection[] =>
  sections.map(keyedBy(firstById(sections)));

/*
 * A List with `onMove` draws its native sections in the order it shows (`moves`, its owner's or a held move's): each
 * Section's movable rows in that order, a moved row in the Section it moved to. Rows the List cannot move keep their
 * places.
 */
export function shownNativeSections(
  children: ReactNode,
  moves: readonly MoveSection[],
): NativeSection[] {
  const sections = withMovingKeys(allSections(children));

  const targets = sections.map((section) => movedIn(section, moves));

  return sections
    .map(shownBy(refillOf(sections, moves), targets))
    .filter(hasRows);
}

export const nativeRowKey = (row: NativeRow): string => row.key;

// The platform's own row height until a row is measured.
export const estimatedNativeRowHeight = 56;
