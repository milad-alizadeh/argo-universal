import type { ReactElement, ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import type { ValuePlacement } from '#kit/list-look';
import { cn } from '#kit/utils';
import { Text } from '#primitives/content/text';
import type { TableColumn } from './table-props';
import type { TableCell } from './table-rows';

// Column widths are tokens: the first column fills, the rest hold a fixed Tailwind width.
const widths = {
  sm: { className: 'w-24', steps: 24 },
  md: { className: 'w-32', steps: 32 },
  lg: { className: 'w-48', steps: 48 },
} as const;

const widthOf = (column: TableColumn): (typeof widths)[keyof typeof widths] =>
  widths[column.width ?? 'md'];

export function columnClass(column: TableColumn, first: boolean): string {
  if (column.grow !== undefined) return 'min-w-0';

  if (first) return 'min-w-0 flex-1';

  return cn('shrink-0', widthOf(column).className);
}

/*
 * A column that carries its own share takes it as a style: it grows by that share from a zero basis, so the columns
 * divide the row in proportion to what they hold, and never falls under the width it keeps for its text.
 */
export function columnStyle(column: TableColumn): ViewStyle | undefined {
  if (column.grow === undefined) return undefined;

  return { flexGrow: column.grow, flexBasis: 0, minWidth: column.minWidth };
}

// The same column where a Table scrolls sideways, where a share has nothing to divide: it takes the width it keeps.
export function scrolledColumnStyle(
  column: TableColumn,
): ViewStyle | undefined {
  if (column.grow === undefined) return undefined;

  return { width: column.minWidth };
}

// A drawn cell on a ListItem: Android writes it under the title, as its other ListItems do; elsewhere it trails.
export const nodeValue = (
  content: ReactNode,
  placement: ValuePlacement,
): { trailing: ReactNode } | { meta: ReactNode } =>
  placement === 'under-title' ? { meta: content } : { trailing: content };

export const alignClass = (column: TableColumn): string | undefined =>
  column.align === 'end' ? 'items-end' : undefined;

interface CellProps {
  cell: TableCell;
  column: TableColumn;
  first: boolean;
}

// A cell keeps its kind: a Pill stays a Pill; plain text is foreground in the first column and muted after it.
export const CellContent = (props: CellProps): ReactElement =>
  props.cell.content ? <NodeCell {...props} /> : <TextCell {...props} />;

function NodeCell({ cell, column }: CellProps): ReactElement {
  return (
    <View className={cn('min-w-0 flex-row', end(column) && 'justify-end')}>
      {cell.content}
    </View>
  );
}

function TextCell({ cell, column, first }: CellProps): ReactElement {
  return (
    <Text
      tone={first ? undefined : 'muted'}
      numberOfLines={1}
      className={end(column) ? 'text-right' : undefined}
    >
      {cell.text}
    </Text>
  );
}

const end = (column: TableColumn): boolean => column.align === 'end';

export function GridCell(props: CellProps): ReactElement {
  return (
    <View
      role="cell"
      style={columnStyle(props.column)}
      className={cn(
        columnClass(props.column, props.first),
        alignClass(props.column),
      )}
    >
      <CellContent {...props} />
    </View>
  );
}

export const columnWidthSteps = (column: TableColumn): number =>
  widths[column.width ?? 'md'].steps;

// The least room a column needs before the grid starts scrolling: its own kept width, or its token's steps.
export const columnLeastWidth = (column: TableColumn, step: number): number =>
  column.minWidth ?? columnWidthSteps(column) * step;
