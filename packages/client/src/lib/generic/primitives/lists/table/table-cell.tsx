import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/content/text';
import type { TableColumn } from './table-props';
import type { TableCell } from './table-rows';

// Column widths are tokens: the first column fills, the rest hold a fixed Tailwind width.
const widths = { sm: 'w-24', md: 'w-32', lg: 'w-48' } as const;

export function columnClass(column: TableColumn, first: boolean): string {
  if (first) return 'min-w-0 flex-1';

  return cn('shrink-0', widths[column.width ?? 'md']);
}

// A drawn cell on a ListItem: Android writes it under the title, as its other ListItems do; elsewhere it trails.
export const nodeValue = (
  content: ReactNode,
): { trailing: ReactNode } | { meta: ReactNode } =>
  Platform.OS === 'android' ? { meta: content } : { trailing: content };

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
