import type * as React from 'react';
import type { ReactElement } from 'react';
import { Table } from './table';
import type { TableColumn } from './table-props';

const platformColumns = [
  { id: 'platform', title: 'Platform', width: 'sm' },
  { id: 'status', title: 'Status', width: 'sm' },
  { id: 'version', title: 'Version', width: 'sm' },
  { id: 'notes', title: 'Notes', width: 'lg' },
] as const satisfies readonly TableColumn[];

const platformRows = [
  ['macOS', 'Shipped', '1.4', 'Universal build'],
  ['iOS', 'In review', '1.4', 'TestFlight build'],
  ['Android', 'Planned', '1.5', 'Waits on Material 3'],
] as const;

const platformRow = (row: (typeof platformRows)[number]): ReactElement => (
  <Table.Row key={row[0]} id={row[0]}>
    {platformColumns.map((column, index) => (
      <Table.Cell key={column.id} column={column.id} text={row[index] ?? ''} />
    ))}
  </Table.Row>
);

// A Markdown pipe table: the grid scrolls sideways at compact widths.
export function PlatformsTable(): React.JSX.Element {
  return (
    <Table
      accessibilityLabel="Platforms"
      compactLayout="scroll"
      columns={platformColumns}
    >
      {platformRows.map(platformRow)}
    </Table>
  );
}
