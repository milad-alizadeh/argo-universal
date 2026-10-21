import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import type { TableRow } from './table-rows';
import { useScrollRowHeight } from './table-scroll-sizes';

// Laid over both columns and the fades so separators stay unbroken.
export function Separators({ rows }: { rows: readonly TableRow[] }): ReactNode {
  return (
    <View
      aria-hidden
      pointerEvents="none"
      className="absolute inset-x-1 top-8 z-20"
    >
      {rows.map((row, index) => rowSeparator(row, index === rows.length - 1))}
    </View>
  );
}

function RowSeparator({
  row,
  last,
}: {
  row: string;
  last: boolean;
}): ReactElement {
  const height = useScrollRowHeight(row);

  return <View style={{ height }}>{last ? null : <Separator />}</View>;
}

const rowSeparator = (row: TableRow, last: boolean): ReactElement => (
  <RowSeparator key={row.key} row={row.key} last={last} />
);

function Separator(): ReactElement {
  return <View className="absolute bottom-0 left-3 right-0 h-px bg-border" />;
}
