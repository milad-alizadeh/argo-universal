import { use, type ReactElement } from 'react';
import type { ListLook } from '#kit/list-look';
import { useListLook } from '#kit/list-look-context';
import { ContextActions } from '#primitives/actions/action';
import { List } from '#primitives/lists/list';
import { ListItem, type ListItemProps } from '#primitives/lists/list-item';
import { nodeValue } from './table-cell';
import type { TableProps } from './table-props';
import { TableRowDetail, TableRowDetailHost } from './table-row-detail';
import {
  cellOf,
  compactColumns,
  type CompactColumns,
  type TableRow,
} from './table-rows';
import { TableSortMenu } from './table-sort-menu';

type ListProps = TableProps & {
  rows: readonly TableRow[];
};

// Compact widths: a grouped List of ListItems, each opening its Row detail; Sort by is a Menu above the rows.
export function TableList(props: ListProps): ReactElement {
  return (
    <>
      <TableSortMenu {...props} />
      <List appearance="plain" accessibilityLabel={props.accessibilityLabel}>
        <CompactRows {...props} roles={compactColumns(props.columns)} />
      </List>
    </>
  );
}

function CompactRows(
  props: ListProps & { roles: CompactColumns },
): ReactElement {
  return (
    <List.Section {...sectionSelection(props)}>
      {props.rows.map((row) => (
        <CompactRow key={row.key} {...props} row={row} />
      ))}
    </List.Section>
  );
}

const sectionSelection = (props: TableProps): Partial<TableProps> =>
  props.selectionMode
    ? {
        selectionMode: props.selectionMode,
        selection: props.selection,
        onSelectionChange: props.onSelectionChange,
      }
    : {};

type RowProps = ListProps & {
  roles: CompactColumns;
  row: TableRow;
};

function CompactRow(props: RowProps): ReactElement {
  return (
    <ContextActions actions={props.row.actions}>
      <ListItem {...useItemProps(props)} />
    </ContextActions>
  );
}

// A row that pushes its detail takes the disclosure chevron where the List look draws one for it.
function useItemProps({ roles, row, ...props }: RowProps): ListItemProps {
  const onPress = useRowOpen({ ...props, roles, row });
  const look = useListLook();

  return {
    id: props.selectionMode ? row.id : undefined,
    title: cellOf(row, roles.title).text,
    accessibilityLabel: row.accessibilityLabel,
    onPress,
    disclosure: look.pushChevron && !!onPress,
    ...lines(row, roles, look),
  };
}

function useRowOpen(props: RowProps): (() => void) | undefined {
  const open = use(TableRowDetailHost);

  if (!open) return props.row.onPress;

  return () =>
    open(
      <TableRowDetail
        columns={props.columns}
        titleColumn={props.roles.title}
        row={props.row}
      />,
    );
}

type Lines = Pick<ListItemProps, 'subtitle' | 'value' | 'trailing' | 'meta'>;

// Android writes the value after the subtitle, "main · 2 min ago", as its other ListItems do.
const textValue = (
  subtitle: string,
  value: string,
  { valuePlacement }: ListLook,
): Lines =>
  valuePlacement === 'under-title'
    ? { subtitle: [subtitle, value].filter(Boolean).join(' · ') }
    : { subtitle, value };

function lines(row: TableRow, roles: CompactColumns, look: ListLook): Lines {
  const subtitle = cellOf(row, roles.subtitle).text;
  const value = cellOf(row, roles.value);

  if (value.content)
    return { subtitle, ...nodeValue(value.content, look.valuePlacement) };

  return textValue(subtitle, value.text, look);
}
