import type * as React from 'react';
import { useState, type ReactElement, type ReactNode } from 'react';
import { Table } from './table';
import type { TableProps, TableSort } from './table-props';
import { TableRowDetailHost } from './table-row-detail';
import { runColumns, runRow, sortedRuns } from './table.mocks';

export type RunsTableProps = Pick<
  TableProps,
  | 'compactLayout'
  | 'selectionMode'
  | 'selection'
  | 'onSelectionChange'
  | 'onSortChange'
> & {
  onRowPress?: (id: string) => void;
  onRerun?: (id: string) => void;
};

const firstSort: TableSort = { column: 'started', direction: 'ascending' };

// CI runs, sorted by Started and re-sorted on each header press.
function useSort(
  report: TableProps['onSortChange'],
): Pick<TableProps, 'sort' | 'onSortChange'> & { sort: TableSort } {
  const [sort, setSort] = useState(firstSort);

  return {
    sort,
    onSortChange: (next) => {
      setSort(next);
      report?.(next);
    },
  };
}

const rowsOf = (
  sort: TableSort,
  { onRowPress, onRerun }: RunsTableProps,
): ReactElement[] =>
  sortedRuns(sort).map((run) =>
    runRow({ run, onRerun, onPress: () => onRowPress?.(run[0]) }),
  );

export function RunsTable(props: RunsTableProps): React.JSX.Element {
  const sorting = useSort(props.onSortChange);

  return (
    <Table
      accessibilityLabel="CI runs"
      columns={runColumns}
      {...props}
      {...sorting}
    >
      {rowsOf(sorting.sort, props)}
    </Table>
  );
}

// A choosing Table with its selection held here, as a Plugin's controls hold it.
export function SelectingRunsTable(props: RunsTableProps): React.JSX.Element {
  const [selection, setSelection] = useState<readonly string[]>([]);

  return (
    <RunsTable
      {...props}
      selectionMode="multiple"
      selection={selection}
      onSelectionChange={setSelection}
    />
  );
}

// Storybook has no page stack, so a Row detail replaces the table in place.
export function InPlaceRowDetail(props: {
  children: ReactNode;
}): React.JSX.Element {
  const [detail, setDetail] = useState<ReactElement>();

  return (
    <TableRowDetailHost value={setDetail}>
      {detail ?? props.children}
    </TableRowDetailHost>
  );
}
