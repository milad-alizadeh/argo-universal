import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  CartesianChart,
  type ChartBounds,
  type Scale,
  type CartesianChartRenderArg,
} from 'victory-native';
import { type NativeTheme } from '../../../native-theme';
import { toneColor } from '../canvas/canvas-colors';
import { ChartAxes, type ChartScales } from './chart-axes';
import {
  type BarSlots,
  type CartesianData,
  type ChartProps,
  type ChartRow,
  type SeriesKey,
  barSlots,
  cartesianData,
} from './chart-data';
import { drawMarks } from './chart-marks';
import {
  type Handlers,
  axisConfig,
  layoutConfig,
  rowsConfig,
} from './chart-plot-config';

export const fill = { flex: 1, pointerEvents: 'none' } as const;

export interface CartesianDrawingProps {
  props: ChartProps;
  theme: NativeTheme;
}

interface Drawing extends CartesianDrawingProps {
  data: CartesianData;
  slots: BarSlots;
}

interface Geometry {
  scales: ChartScales | undefined;
  bounds: ChartBounds | undefined;
  handlers: Handlers;
}

const seriesColors = (props: ChartProps, theme: NativeTheme): string[] =>
  props.series.map(({ tone }) => toneColor(tone, theme) ?? '');

function useCartesianData({
  series,
  stacked,
  kind,
}: ChartProps): CartesianData {
  return useMemo(
    () => cartesianData({ series, stacked, kind }),
    [series, stacked, kind],
  );
}

function useGeometry(): Geometry {
  const [scales, setScales] = useState<ChartScales>();
  const [bounds, onChartBoundsChange] = useState<ChartBounds>();

  const onScaleChange = useCallback(
    (x: Scale, y: Scale) => setScales({ x, y }),
    [],
  );

  return { scales, bounds, handlers: { onScaleChange, onChartBoundsChange } };
}

function drawSeries(
  arg: CartesianChartRenderArg<ChartRow, SeriesKey>,
  { props, theme, data, slots }: Drawing,
): React.ReactNode {
  const plot = {
    points: data.keys.map((key) => arg.points[key] ?? []),
    zero: arg.yScale(0),
    bounds: arg.chartBounds,
    barCount: slots.count,
  };

  return drawMarks(props, plot, seriesColors(props, theme));
}

interface PlotInput {
  drawing: Drawing;
  handlers: Handlers;
}

const hasGrid = ({ props }: Drawing): boolean => props.grid === true;

function CartesianPlot({ drawing, handlers }: PlotInput): React.JSX.Element {
  return (
    <CartesianChart
      {...rowsConfig(drawing.data)}
      {...layoutConfig(drawing)}
      {...axisConfig(drawing.theme, drawing.data.rows.length, hasGrid(drawing))}
      {...handlers}
    >
      {(arg) => drawSeries(arg, drawing)}
    </CartesianChart>
  );
}

function Axes({
  geometry: { scales, bounds },
  columns,
}: {
  geometry: Geometry;
  columns: number;
}): React.JSX.Element | null {
  return scales && bounds ? (
    <ChartAxes scales={scales} bounds={bounds} columns={columns} />
  ) : null;
}

export function CartesianDrawing(
  input: CartesianDrawingProps,
): React.JSX.Element {
  const data = useCartesianData(input.props);
  const geometry = useGeometry();
  const drawing = { ...input, data, slots: barSlots(data.rows) };

  return (
    <View style={fill}>
      <CartesianPlot drawing={drawing} handlers={geometry.handlers} />
      <Axes geometry={geometry} columns={data.rows.length} />
    </View>
  );
}
