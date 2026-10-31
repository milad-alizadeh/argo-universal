import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import { useSpacing } from '../../../use-spacing';
import { columnLeastWidth } from './table-cell';
import { TableGrid } from './table-grid';
import type { GridProps } from './table-grid-row';
import type { TableColumn } from './table-props';

// The first column can fill spare room, but never yields its width to later columns.
export function TableOverflow(props: GridProps): ReactElement {
  const minWidth = useGridWidth(props.columns);

  return (
    <ScrollFadeView
      horizontal
      surfaceClassName="bg-card"
      className="w-full"
      contentContainerClassName="min-w-full"
    >
      <View className="flex-1" style={{ minWidth }}>
        <TableGrid {...props} />
      </View>
    </ScrollFadeView>
  );
}

function useGridWidth(columns: readonly TableColumn[]): number {
  const step = useSpacing('--spacing-1');
  const gap = useSpacing('--spacing-4');
  const padding = gap * 2;

  const widths = columns.reduce(
    (sum, column) => sum + columnLeastWidth(column, step),
    0,
  );

  return widths + gap * Math.max(0, columns.length - 1) + padding;
}
