import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
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

// Gridlines are opt-in; the frame keeps its hairline either way.
interface LineWidths {
  grid: number;
  frame: number;
}

const lineWidths = (grid: boolean): LineWidths => ({
  grid: grid ? StyleSheet.hairlineWidth : 0,
  frame: StyleSheet.hairlineWidth,
});

export function axisConfig(
  theme: NativeTheme,
  columns: number,
  grid: boolean,
): Pick<Plot, 'axisOptions'> {
  const line = theme.colors.border;

  return {
    axisOptions: {
      lineColor: line ? skiaColor(line) : undefined,
      lineWidth: lineWidths(grid),
      tickCount: { x: xTickCount(columns), y: yTickCount },
    },
  };
}
