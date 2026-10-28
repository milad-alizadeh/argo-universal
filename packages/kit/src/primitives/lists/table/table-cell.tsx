import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
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

export function columnClass(column: TableColumn, first: boolean): string {
  if (first) return 'min-w-0 flex-1';

  return cn('shrink-0', widths[column.width ?? 'md'].className);
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
