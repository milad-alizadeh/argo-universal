import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import { trayClassName } from '../../../tray-surface';
import { useSpacing } from '../../../use-spacing';
import { CellContent, columnClass, scrolledColumnStyle } from './table-cell';
import { HeaderCell } from './table-header';
import type { TableColumn, TableProps } from './table-props';
import { cellOf, type TableRow } from './table-rows';
import { Separators } from './table-scroll-separators';
import { MeasuredScrollRow, ScrollRowSizes } from './table-scroll-sizes';

type ScrollProps = TableProps & {
  rows: readonly TableRow[];
};

const trayClass = `relative overflow-hidden ${trayClassName}`;

/*
 * compactLayout "scroll", a Markdown pipe table's: the grid stays at compact widths, its first column pinned and the
 * rest scrolling sideways in the tray, fading at each edge with more to show. Separators run unbroken over the fades.
 * Both sides expose their contents so links remain available to assistive technology.
 */
export function TableScroll(props: ScrollProps): ReactElement {
  return (
    <View
      role="table"
      accessibilityLabel={props.accessibilityLabel}
      className={trayClass}
    >
      <ScrollRowSizes>
        <CardBackground />
        <Columns {...props} />
        <Separators rows={props.rows} />
      </ScrollRowSizes>
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

// The pinned column's leading padding, `pl-3` on its header and cells: 12px.
const pinnedInset = 12;

function PinnedColumn(props: ColumnProps): ReactElement {
  return (
    <View
      className={columnClass(props.column, false)}
      style={scrolledColumnStyle(props.column, pinnedInset)}
    >
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
    <MeasuredScrollRow
      row={row.key}
      side="pinned"
      accessibilityLabel={row.accessibilityLabel}
      contentClassName="min-h-12 shrink-0 justify-center py-3 pl-3"
    >
      <CellContent cell={cell} column={column} first />
    </MeasuredScrollRow>
  );
}

// Scrolled cells stay in the accessibility tree, including their links and controls.
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
          style={scrolledColumnStyle(column)}
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
    <MeasuredScrollRow
      row={props.row.key}
      side="scrolled"
      contentClassName="min-h-12 shrink-0 flex-row items-start gap-4 py-3"
    >
      {scrolledCells(props.columns, props.row)}
    </MeasuredScrollRow>
  );
}

function ScrolledCell({ column, row }: CellRowProps): ReactElement {
  return (
    <View
      className={columnClass(column, false)}
      style={scrolledColumnStyle(column)}
    >
      <CellContent cell={cellOf(row, column)} column={column} first={false} />
    </View>
  );
}

const scrolledCells = (
  columns: TableProps['columns'],
  row: TableRow,
): ReactElement[] =>
  columns.map((column) => (
    <ScrolledCell key={column.id} column={column} row={row} />
  ));
