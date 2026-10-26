import { chartDefaults } from '@repo/contracts/kit-tokens';
import type { ComponentProps } from 'react';
import type { CartesianChart } from 'victory-native';
import type { NativeTheme } from '../../../native-theme';
import { skiaColor } from '../canvas/canvas-srgb';
import { chartPadding, xTickCount, yTickCount } from './chart-axes';
import {
  type BarSlots,
  type CartesianData,
  type ChartProps,
  type ChartRow,
  type SeriesKey,
  yDomain,
} from './chart-data';

type Plot = ComponentProps<typeof CartesianChart<ChartRow, 'x', SeriesKey>>;

export type Handlers = Pick<Plot, 'onScaleChange' | 'onChartBoundsChange'>;

// A dot at the extreme of its domain would be cut in half by the plot edge.
const scatterPadding = { left: 8, right: 8, top: 8, bottom: 8 };

interface Layout {
  props: ChartProps;
  data: CartesianData;
  slots: BarSlots;
}

export const rowsConfig = ({
  keys,
  rows,
}: CartesianData): Pick<Plot, 'data' | 'xKey' | 'yKeys' | 'padding'> => ({
  data: rows,
  xKey: 'x',
  yKeys: keys,
  padding: chartPadding,
});

export const layoutConfig = ({
  props,
  data,
  slots,
}: Layout): Pick<Plot, 'domain' | 'domainPadding'> => ({
  domain: {
    x: props.kind === 'bar' ? slots.x : undefined,
    y: yDomain(props, data),
  },
  domainPadding: props.kind === 'scatter' ? scatterPadding : undefined,
});

export function axisConfig(
  props: ChartProps,
  theme: NativeTheme,
  columns: number,
): Pick<Plot, 'axisOptions' | 'frame'> {
  const line = theme.colors.border ? skiaColor(theme.colors.border) : undefined;

  return {
    axisOptions: {
      lineColor: line ? lineColors(props, line) : undefined,
      tickCount: { x: xTickCount(columns), y: yTickCount },
    },
    frame: { lineColor: line, lineWidth: axisLines },
  };
}

// The gridlines show only when the chart asks for them. Skia strokes a 0 width as a hairline, so a hidden grid is drawn transparent.
type LineColor = NonNullable<Plot['axisOptions']>['lineColor'];

const lineColors = (props: ChartProps, line: string): LineColor => ({
  grid: (props.grid ?? chartDefaults.grid) ? line : 'transparent',
  frame: line,
});

// Of the frame around the plot, only the two axes draw: the left and bottom edges.
const axisLines = { top: 0, right: 0 };
