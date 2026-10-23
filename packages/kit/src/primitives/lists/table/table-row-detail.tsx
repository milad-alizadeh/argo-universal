import { createContext, type ReactElement } from 'react';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Screen } from '#primitives/scaffolds/screen';
import { nodeValue } from './table-cell';
import type { TableColumn, TableProps } from './table-props';
import { cellOf, type TableCell, type TableRow } from './table-rows';

// Pushes a Row detail Screen onto the App's stack; without one, a compact row runs its primary Action.
export type OpenRowDetail = (detail: ReactElement) => void;

export const TableRowDetailHost = createContext<OpenRowDetail | undefined>(
  undefined,
);

interface RowDetailProps {
  columns: TableProps['columns'];
  titleColumn?: TableColumn;
  row: TableRow;
}

// The row's title column names the Screen; one ListItem per other column, in column order, hidden ones included.
export function TableRowDetail(props: RowDetailProps): ReactElement {
  const { row, titleColumn } = props;

  return (
    <Screen title={cellOf(row, titleColumn).text} actions={row.actions}>
      <List appearance="plain">
        <DetailItems {...props} />
      </List>
    </Screen>
  );
}

const detailItem = (row: TableRow) =>
  function RowField(column: TableColumn): ReactElement {
    return (
      <DetailItem key={column.id} column={column} cell={cellOf(row, column)} />
    );
  };

function DetailItems(props: RowDetailProps): ReactElement {
  const shown = props.columns.filter((column) => column !== props.titleColumn);

  return <List.Section>{shown.map(detailItem(props.row))}</List.Section>;
}

interface DetailItemProps {
  column: TableColumn;
  cell: TableCell;
}

// The cell is the row's value: trailing on iOS and the web, under the title on Android; a Pill stays a Pill.
function DetailItem({ column, cell }: DetailItemProps): ReactElement {
  if (!cell.content) return <ListItem title={column.title} value={cell.text} />;

  return (
    <ListItem
      title={column.title}
      accessibilityLabel={`${column.title}, ${cell.text}`}
      {...nodeValue(cell.content)}
    />
  );
}
