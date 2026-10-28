import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import { isSection } from './list-level-entries';
import type { MoveSection } from './list-move-model';

/*
 * What a native grouped List draws: sections of FieldGroup rows (list-native-props). A row is only a function
 * that makes its element, so the native list mounts the rows near the viewport. In a List with `onMove`, a row the
 * List can move carries its `moveId`.
 */
export type NativeRow = {
  key: string;
  // The row's own `id`.
  id?: string;
  moveId?: string;
  render: () => ReactElement;
};

export type NativeSection = {
  key: string;
  // The List.Section's own `id`; a run of rows outside any Section is `loose` instead.
  id?: string;
  loose?: true;
  title?: string;
  footer?: string;
  rows: NativeRow[];
};

type RowElement = ReactElement<{ id?: unknown }>;

const isRow = (node: ReactNode): node is RowElement => isValidElement(node);

const ownId = ({ props }: RowElement): string | undefined =>
  typeof props.id === 'string' ? props.id : undefined;

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
    id,
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
  movable: ReadonlySet<string>;
  rows: ReadonlyMap<string, NativeRow>;
  // Each move Section's rows not yet placed, in the order shown.
  left: Map<MoveSection, string[]>;
}

const placed = (refill: Refill, id: string): NativeRow[] => {
  const row = refill.rows.get(id);

  return row ? [{ ...row, moveId: id }] : [];
};

// A native section's movable slots take the next of its move Section's rows; its last native section takes the rest.
function refilled(
  section: NativeSection,
  move: MoveSection,
  { refill, last }: { refill: Refill; last: boolean },
): NativeSection {
  const left = refill.left.get(move) ?? [];
  const isMovable = (row: NativeRow): boolean =>
    row.id !== undefined && refill.movable.has(row.id);

  const rows = section.rows.flatMap((row) => {
    if (!isMovable(row)) return [row];

    const id = left.shift();

    return id === undefined ? [] : placed(refill, id);
  });

  const rest = last ? left.splice(0).flatMap((id) => placed(refill, id)) : [];

  return { ...section, rows: [...rows, ...rest] };
}

/*
 * A List with `onMove` draws its native sections in the order it shows (`moves`, its owner's or a held move's): each
 * Section's movable rows in that order, a moved row in the Section it moved to. Rows the List cannot move keep their
 * places.
 */
export function shownNativeSections(
  children: ReactNode,
  moves: readonly MoveSection[],
): NativeSection[] {
  const sections = allSections(children);
  const movable = new Set(moves.flatMap((move) => move.rows));
  const rows = new Map(
    sections
      .flatMap((section) => section.rows)
      .flatMap((row) => (row.id === undefined ? [] : [[row.id, row] as const])),
  );
  const refill = {
    movable,
    rows,
    left: new Map(moves.map((move) => [move, [...move.rows]])),
  };
  const targets = sections.map((section) => movedIn(section, moves));

  return sections
    .map((section, index) => {
      const move = targets[index];
      const last = move !== undefined && targets.lastIndexOf(move) === index;

      return move ? refilled(section, move, { refill, last }) : section;
    })
    .filter(hasRows);
}

export const nativeRowKey = (row: NativeRow): string => row.key;

// The platform's own row height until a row is measured.
export const estimatedNativeRowHeight = 56;
