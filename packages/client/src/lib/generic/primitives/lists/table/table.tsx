import type { ReactElement, ReactNode } from 'react';
import { useSizeClass } from '../../../use-size-class/use-size-class';
import { TableGrid } from './table-grid';
import { TableList } from './table-list';
import type { TableProps } from './table-props';
import { TableCellPart, TableRowPart, tableRows } from './table-rows';
import { TableScroll } from './table-scroll';

/*
 * Foundations / Table: columns on regular widths; at compact widths a List of ListItems whose rows push their Row
 * detail, or with compactLayout "scroll" the same grid scrolling sideways.
 */
export function Table(props: TableProps): ReactElement {
  const compact = useSizeClass() === 'compact';
  const rows = tableRows(tableChildren(props), props.columns);

  if (!compact) return <TableGrid {...props} rows={rows} />;

  if (props.compactLayout === 'scroll')
    return <TableScroll {...props} rows={rows} />;

  return <TableList {...props} rows={rows} />;
}

const tableChildren = (props: TableProps): ReactNode =>
  props.items ? props.items.map(props.renderItem) : props.children;

Table.Row = TableRowPart;

Table.Cell = TableCellPart;
