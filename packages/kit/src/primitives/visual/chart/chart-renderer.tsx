import { View } from 'react-native';
import { Pie as PieChart, PolarChart } from 'victory-native';
import { type NativeTheme, useNativeTheme } from '../../../native-theme';
import { toneColor } from '../canvas/canvas-colors';
import { chartPadding } from './chart-axes';
import { CartesianDrawing, fill } from './chart-cartesian';
import {
  type ChartProps,
  type PieSlice,
  isPolar,
  pieLegend,
  pieSlices,
} from './chart-data';
import { ChartLegend } from './chart-legend';

const donutHole = '60%';

// Victory draws; the kit Text over it labels the axes, since CanvasKit cannot reach system fonts.
export default function ChartRenderer(props: ChartProps): React.JSX.Element {
  const theme = useNativeTheme();
  const Drawing = isPolar(props.kind) ? PieDrawing : CartesianDrawing;

  return (
    <View style={fill}>
      <Drawing props={props} theme={theme} />
    </View>
  );
}

interface PieDrawingProps {
  props: ChartProps;
  theme: NativeTheme;
}

const side = { flexDirection: 'row' } as const;

// The pie keeps the plot's top inset on every side, so it clears the tile's rounded corners.
const pieBox = { flex: 1, padding: chartPadding.top } as const;

type Colored = { [K in keyof PieSlice]: PieSlice[K] } & { color: string };

const sliceColors = (slices: PieSlice[], theme: NativeTheme): Colored[] =>
  slices.map((slice) => ({
    ...slice,
    color: toneColor(slice.tone, theme) ?? '',
  }));

function PieDrawing({ props, theme }: PieDrawingProps): React.JSX.Element {
  const slices = sliceColors(pieSlices(props.series), theme);

  const colors = Object.fromEntries(
    slices.map(({ key, color }) => [key, color]),
  );

  return (
    <View style={[fill, side]}>
      <View style={pieBox}>
        <Pie slices={slices} kind={props.kind} />
      </View>
      <ChartLegend rows={pieLegend(props.series)} colors={colors} />
    </View>
  );
}

function Pie({
  slices,
  kind,
}: {
  slices: Colored[];
  kind: string;
}): React.JSX.Element {
  return (
    <PolarChart data={slices} labelKey="name" valueKey="value" colorKey="color">
      <PieChart.Chart innerRadius={kind === 'donut' ? donutHole : 0} />
    </PolarChart>
  );
}
