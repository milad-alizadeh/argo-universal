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
import { withMovingKeys } from './list-native-keys';
import { refilledSections } from './list-native-refill';

/*
 * What a native grouped List draws: sections of FieldGroup rows (list-native-props). A row is only a function
 * that makes its element, so the native list mounts the rows near the viewport. In a List with `onMove`, a row the
 * List can move carries its `moveId`.
 */
export type NativeRow = {
  key: string;
  // The row's own `id`: the key it keeps wherever it moves (list-native-keys), and the id a move reports.
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

  return refilledSections(sections, moves).filter(hasRows);
}

export const nativeRowKey = (row: NativeRow): string => row.key;

// The platform's own row height until a row is measured.
export const estimatedNativeRowHeight = 56;
