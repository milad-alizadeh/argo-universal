import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import { useSpacing } from '../../../use-spacing';
import { columnLeastWidth } from './table-cell';
import { TableGrid } from './table-grid';
import type { GridProps } from './table-grid-row';
import type { TableColumn } from './table-props';

/*
 * The grid is exactly as wide as the Table, or as its columns' kept widths when those are wider, and only then scrolls.
 * A width the content decided would be its text unwrapped, which inline code in a cell turns into a row wider than the
 * Feed, so the content container takes the scroll view's own width as its floor.
 */
export function TableOverflow(props: GridProps): ReactElement {
  const minWidth = useGridWidth(props.columns);

  return (
    <ScrollFadeView
      horizontal
      surfaceClassName="bg-card"
      className="w-full"
      contentContainerStyle={{ width: '100%', minWidth }}
    >
      <View className="flex-1">
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
