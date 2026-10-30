import { listDefaults } from '@repo/contracts/kit-tokens';
import type { SizeClass } from '../../../use-size-class/size-class';
import type { ListProps } from './list-props';

type Options = Pick<
  ListProps<never>,
  'columns' | 'tileSize' | 'direction' | 'aspect'
>;

const minimums = { sm: 200, md: 256, lg: 320 };

const compactMinimums = { sm: 104, md: 160, lg: Infinity };

const caps = { compact: 2, medium: 4, wide: 6 };

const landscapeAspect = 1.6;

const portraitAspect = 0.75;

const aspects = {
  square: 1,
  landscape: landscapeAspect,
  portrait: portraitAspect,
};

interface Metrics {
  width: number;
  gap: number;
  sizeClass: SizeClass;
}

interface TileLayout {
  columns: number;
  width: number;
  aspect: number;
}

function minimumWidth(props: Options, sizeClass: SizeClass): number {
  const sizes = sizeClass === 'compact' ? compactMinimums : minimums;

  return sizes[props.tileSize ?? listDefaults.tileSize];
}

function columnCount(
  props: Options,
  metrics: Metrics,
  minimum: number,
): number {
  const fitting = Math.max(
    1,
    Math.floor((metrics.width + metrics.gap) / (minimum + metrics.gap)),
  );

  const requested = requestedCount(props.columns, fitting);

  const cap =
    minimum === Infinity ? 1 : columnCap(props.columns, metrics.sizeClass);

  return Math.max(1, Math.min(requested, cap));
}

export function tileLayout(props: Options, metrics: Metrics): TileLayout {
  const minimum = minimumWidth(props, metrics.sizeClass);
  const aspect = aspects[props.aspect ?? 'landscape'];

  if (props.direction === 'horizontal')
    return { columns: 1, width: Math.min(metrics.width, minimum), aspect };

  const columns = columnCount(props, metrics, minimum);

  return {
    columns,
    width: Math.max(0, (metrics.width - metrics.gap * (columns - 1)) / columns),
    aspect,
  };
}

function autoCap(sizeClass: SizeClass): number {
  return sizeClass === 'compact' ? caps.compact : Infinity;
}

function requestedCount(columns: Options['columns'], fitting: number): number {
  return typeof columns === 'number' ? columns : fitting;
}

function columnCap(columns: Options['columns'], sizeClass: SizeClass): number {
  return typeof columns === 'number' ? caps[sizeClass] : autoCap(sizeClass);
}
