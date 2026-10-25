import { View } from 'react-native';
import { Pie, PolarChart } from 'victory-native';
import { type NativeTheme, useNativeTheme } from '../../../native-theme';
import { toneColor } from '../canvas/canvas-colors';
import { CartesianDrawing, fill } from './chart-cartesian';
import { type ChartProps, isPolar, pieSlices } from './chart-data';

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

function PieDrawing({ props, theme }: PieDrawingProps): React.JSX.Element {
  const slices = pieSlices(props.series).map((slice) => ({
    ...slice,
    color: toneColor(slice.tone, theme) ?? '',
  }));

  return (
    <PolarChart data={slices} labelKey="name" valueKey="value" colorKey="color">
      <Pie.Chart innerRadius={props.kind === 'donut' ? donutHole : 0} />
    </PolarChart>
  );
}
