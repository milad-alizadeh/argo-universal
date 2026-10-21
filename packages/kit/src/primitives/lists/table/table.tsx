import type { ReactElement, ReactNode } from 'react';
import { useSizeClass } from '../../../use-size-class/use-size-class';
import { TableGrid } from './table-grid';
import { TableList } from './table-list';
import { TableOverflow } from './table-overflow';
import type { TableProps } from './table-props';
import { TableCellPart, TableRowPart, tableRows } from './table-rows';
import type { TableRow } from './table-rows';
import { TableScroll } from './table-scroll';

/*
 * Foundations / Table: columns on regular widths; at compact widths a List of ListItems whose rows push their Row
 * detail, or with compactLayout "scroll" the same grid scrolling sideways.
 */
export function Table(props: TableProps): ReactElement {
  const compact = useSizeClass() === 'compact';
  const rows = tableRows(tableChildren(props), props.columns);

  if (!compact) return regularTable(props, rows);

  if (scrollsCompact(props)) return <TableScroll {...props} rows={rows} />;

  return <TableList {...props} rows={rows} />;
}

const tableChildren = (props: TableProps): ReactNode =>
  props.items ? props.items.map(props.renderItem) : props.children;

Table.Row = TableRowPart;

Table.Cell = TableCellPart;

function regularTable(
  props: TableProps,
  rows: readonly TableRow[],
): ReactElement {
  return props.overflow === 'scroll' ? (
    <TableOverflow {...props} rows={rows} />
  ) : (
    <TableGrid {...props} rows={rows} />
  );
}

const scrollsCompact = (props: TableProps): boolean =>
  props.overflow === 'scroll' || props.compactLayout === 'scroll';
