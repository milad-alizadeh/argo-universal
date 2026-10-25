import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import type {
  TableCellProps,
  TableColumn,
  TableProps,
  TableRowProps,
} from './table-props';

export interface TableCell {
  text: string;
  // A Pill, Label, StatusDot or Text drawn in the text's place.
  content?: ReactNode;
}

export interface TableRow {
  key: string;
  id: string;
  accessibilityLabel: string;
  onPress?: () => void;
  actions?: ReactNode;
  cells: ReadonlyMap<string, TableCell>;
}

export type CompactRole = NonNullable<TableColumn['compact']>;

// Each line a compact row fills, by column id.
export type CompactColumns = Partial<Record<CompactRole, TableColumn>>;

export const emptyCell: TableCell = { text: '' };

// A row the Table reads: its cells, id, primary Action and Actions.
export function TableRowPart(_props: TableRowProps): null {
  return null;
}

// A cell the Table reads: its column, text, and any part drawn in the text's place.
export function TableCellPart(_props: TableCellProps): null {
  return null;
}

const isRow = (child: ReactNode): child is ReactElement<TableRowProps> =>
  isValidElement(child) && child.type === TableRowPart;

const isCell = (child: ReactNode): child is ReactElement<TableCellProps> =>
  isValidElement(child) && child.type === TableCellPart;

function cellEntry(child: ReactElement<TableCellProps>): [string, TableCell] {
  const { column, text, children } = child.props;
  const content = flattenedChildren(children);

  // A Plugin sends an empty children array for a text-only cell.
  return [column, content.length > 0 ? { text, content } : { text }];
}

const cellsOf = (children: ReactNode): Map<string, TableCell> =>
  new Map(flattenedChildren(children).filter(isCell).map(cellEntry));

const spokenRow = (
  columns: TableProps['columns'],
  cells: ReadonlyMap<string, TableCell>,
): string =>
  columns
    .map((column) => cells.get(column.id)?.text)
    .filter(Boolean)
    .join(', ');

function rowOf(
  child: ReactElement<TableRowProps>,
  index: number,
  columns: TableProps['columns'],
): TableRow {
  const { children, accessibilityLabel, ...row } = child.props;
  const cells = cellsOf(children);

  return {
    ...row,
    key: String(child.key ?? index),
    cells,
    accessibilityLabel: accessibilityLabel ?? spokenRow(columns, cells),
  };
}

// The Table reads its rows and cells from its children, as Metadata reads its fields.
export const tableRows = (
  children: ReactNode,
  columns: TableProps['columns'],
): TableRow[] =>
  flattenedChildren(children)
    .filter(isRow)
    .map((child, index) => rowOf(child, index, columns));

const positionRoles = ['title', 'subtitle'] as const;

// First is title, second subtitle, last value, the rest hidden.
const defaultRole = (index: number, count: number): CompactRole =>
  positionRoles[index] ?? (index === count - 1 ? 'value' : 'hidden');

const roleOf = (
  column: TableColumn,
  index: number,
  count: number,
): CompactRole => column.compact ?? defaultRole(index, count);

function firstColumnPerRole(columns: TableProps['columns']): CompactColumns {
  const roles: CompactColumns = {};

  for (const [index, column] of columns.entries())
    roles[roleOf(column, index, columns.length)] ??= column;

  return roles;
}

// Unless a column names its own line; each line takes its first column, and the first column is the title at worst.
export function compactColumns(columns: TableProps['columns']): CompactColumns {
  const { title, subtitle, value } = firstColumnPerRole(columns);
  const unclaimed = columns.find((c) => c !== subtitle && c !== value);

  return { title: title ?? unclaimed ?? columns[0], subtitle, value };
}

export const cellOf = (row: TableRow, column?: TableColumn): TableCell =>
  (column && row.cells.get(column.id)) ?? emptyCell;
