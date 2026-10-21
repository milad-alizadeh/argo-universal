import type { ListProps } from './list-props';
import type { TileMetrics } from './use-tile-layout';

type WidthMetrics = Pick<
  TileMetrics,
  'viewport' | 'padding' | 'gap' | 'column'
>;

export function tileContentWidth(
  direction: ListProps<never>['direction'],
  metrics: WidthMetrics,
): number {
  const width = Math.max(0, metrics.viewport - metrics.padding * 2);

  if (direction === 'horizontal') return width;

  return columnWidth(width, metrics);
}

function columnWidth(width: number, { column, gap }: WidthMetrics): number {
  if (!column) return width;
  const content = Math.min(width + gap, column.maxWidth ?? Infinity);

  return Math.max(0, content - column.paddingLeft - column.paddingRight - gap);
}
