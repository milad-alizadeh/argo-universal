import type { ReactNode } from 'react';
import type { KitProps } from '../../kit-props';

export type TableProps = KitProps<'Table'> & {
  columns: readonly TableColumn[];
  /** Keep columns and horizontal scrolling at every viewport size. */
  overflow?: 'scroll';
};

export type TableRowProps = KitProps<'Table.Row'>;

export type TableCellProps = KitProps<'Table.Cell'>;

export type TableColumn = KitProps<'Table'>['columns'][number] & {
  /** Rich content in place of the plain title; the title remains its sort label. */
  header?: ReactNode;
  /** Kit-only: the column's share of the row, in place of its width token, for a Table whose content decides its columns. */
  grow?: number;
  /** Kit-only: the width a grown column never goes under. */
  minWidth?: number;
};

export type TableSort = NonNullable<TableProps['sort']>;
