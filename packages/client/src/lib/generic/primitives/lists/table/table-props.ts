import type { KitProps } from '../../kit-props';

export type TableProps = KitProps<'Table'>;

export type TableRowProps = KitProps<'Table.Row'>;

export type TableCellProps = KitProps<'Table.Cell'>;

export type TableColumn = TableProps['columns'][number];

export type TableSort = NonNullable<TableProps['sort']>;
