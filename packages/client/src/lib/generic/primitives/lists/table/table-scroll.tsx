import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import { trayClassName } from '../../../tray-surface';
import { useSpacing } from '../../../use-spacing';
import { CellContent, columnClass } from './table-cell';
import { HeaderCell } from './table-header';
import type { TableColumn, TableProps } from './table-props';
import { cellOf, type TableRow } from './table-rows';

type ScrollProps = TableProps & {
  rows: readonly TableRow[];
};

const trayClass = `relative overflow-hidden ${trayClassName}`;

/*
 * compactLayout "scroll", a Markdown pipe table's: the grid stays at compact widths, its first column pinned and the
 * rest scrolling sideways in the tray, fading at each edge with more to show. Separators run unbroken over the fades. Each
 * pinned cell speaks its whole row, so assistive technology reads the table row by row.
 */
export function TableScroll(props: ScrollProps): ReactElement {
  return (
    <View
      role="table"
      accessibilityLabel={props.accessibilityLabel}
      className={trayClass}
    >
      <CardBackground />
      <Columns {...props} />
      <Separators rows={props.rows} />
    </View>
  );
}

function Columns(props: ScrollProps): ReactElement {
  const [pinned, ...scrolled] = props.columns;

  return (
    <View className="flex-row">
      {pinned ? <PinnedColumn {...props} column={pinned} /> : null}
      <ScrolledColumns {...props} columns={scrolled} />
    </View>
  );
}

// The card under the rows; the header row sits on the tray above it.
function CardBackground(): ReactElement {
  return (
    <View
      aria-hidden
      className="absolute inset-x-1 bottom-1 top-8 rounded-xl bg-card"
    />
  );
}

type ColumnProps = ScrollProps & { column: TableColumn };

function PinnedColumn(props: ColumnProps): ReactElement {
  return (
    <View className={columnClass(props.column, false)}>
      <HeaderCell {...props} className="h-8 justify-center pl-3" />
      {props.rows.map((row) => (
        <PinnedCell key={row.key} column={props.column} row={row} />
      ))}
    </View>
  );
}

interface CellRowProps {
  column: TableColumn;
  row: TableRow;
}

function PinnedCell({ column, row }: CellRowProps): ReactElement {
  const cell = cellOf(row, column);

  return (
    <View
      accessible
      accessibilityLabel={row.accessibilityLabel}
      className="h-12 justify-center pl-3"
    >
      <CellContent cell={cell} column={column} first />
    </View>
  );
}

// Rows are read through each pinned cell, so their scrolled copy is hidden; the header keeps its sort buttons.
function ScrolledColumns(props: ScrollProps): ReactElement {
  const fade = useSpacing('--spacing-8');

  return (
    <ScrollFadeView
      horizontal
      surfaceClassName="bg-card"
      depth={{ leading: fade, trailing: fade }}
      className="flex-1"
      contentContainerClassName="pl-4 pr-3"
    >
      <ScrolledGrid {...props} />
    </ScrollFadeView>
  );
}

// One column of rows: a horizontal ScrollView lays its own children out in a row.
function ScrolledGrid(props: ScrollProps): ReactElement {
  return (
    <View>
      <ScrolledHeader {...props} />
      {props.rows.map((row) => (
        <ScrolledRow key={row.key} columns={props.columns} row={row} />
      ))}
    </View>
  );
}

function ScrolledHeader(props: ScrollProps): ReactElement {
  return (
    <View className="h-8 flex-row items-center gap-4">
      {props.columns.map((column) => (
        <HeaderCell
          key={column.id}
          {...props}
          column={column}
          className={columnClass(column, false)}
        />
      ))}
    </View>
  );
}

function ScrolledRow(props: {
  columns: TableProps['columns'];
  row: TableRow;
}): ReactElement {
  return (
    <View aria-hidden className="h-12 flex-row items-center gap-4">
      {props.columns.map((column) => (
        <ScrolledCell key={column.id} column={column} row={props.row} />
      ))}
    </View>
  );
}

function ScrolledCell({ column, row }: CellRowProps): ReactElement {
  return (
    <View className={columnClass(column, false)}>
      <CellContent cell={cellOf(row, column)} column={column} first={false} />
    </View>
  );
}

// Laid over the pinned column and the fades, row for row, so each separator runs the card's width.
function Separators({ rows }: { rows: readonly TableRow[] }): ReactNode {
  return (
    <View
      aria-hidden
      pointerEvents="none"
      className="absolute inset-x-1 top-8 z-20"
    >
      {rows.map((row, index) => (
        <View key={row.key} className="h-12">
          {index < rows.length - 1 ? <Separator /> : null}
        </View>
      ))}
    </View>
  );
}

function Separator(): ReactElement {
  return <View className="absolute bottom-0 left-3 right-0 h-px bg-border" />;
}
