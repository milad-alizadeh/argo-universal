import { useContext } from 'react';
import { Pressable, type PressableProps, View } from 'react-native';
import { ListTileContext } from '../../../list-context';
import { CanvasBoundary, CanvasFallback } from '../canvas/canvas-boundary';
import { useSvgDrawing } from '../svg/svg-budget';
import type { ChartProps } from './chart-data';
import { ChartLoader } from './chart-loader';
import { ChartTable } from './chart-table';
import { useTableMounted } from './use-table-mounted';

export type { ChartProps } from './chart-data';

const chartWidth = 16;

const chartHeight = 9;

const tileFrame = { width: '100%', height: '100%' } as const;

const inlineFrame = {
  width: '100%',
  aspectRatio: chartWidth / chartHeight,
} as const;

const stretch = { flex: 1 } as const;

interface DrawingProps {
  props: ChartProps;
  draws: boolean;
}

function Drawing({ props, draws }: DrawingProps): React.JSX.Element {
  return draws ? (
    <CanvasBoundary label={props.label} source={props.series}>
      <ChartLoader {...props} />
    </CanvasBoundary>
  ) : (
    <CanvasFallback label={props.label} />
  );
}

const pressProps = (props: ChartProps): PressableProps => ({
  accessible: true,
  accessibilityLabel: props.label,
  accessibilityRole: props.onPress ? 'button' : 'image',
  onPress: props.onPress,
  style: stretch,
});

function ChartImage({ props, draws }: DrawingProps): React.JSX.Element {
  return (
    <Pressable {...pressProps(props)}>
      {/* The Pressable names the chart; the drawing and its fallback would name it twice. */}
      <View aria-hidden style={stretch}>
        <Drawing props={props} draws={draws} />
      </View>
    </Pressable>
  );
}

// Data in, drawing out: Plugins never see Victory or Skia, so the renderer can change (ADR-0028).
export function Chart(props: ChartProps): React.JSX.Element {
  const tile = useContext(ListTileContext);
  const draws = useSvgDrawing();
  const table = useTableMounted();

  // The table sits beside the labelled drawing: inside it, an image or button would hide the rows.
  return (
    <View style={tile ? tileFrame : inlineFrame}>
      <ChartImage props={props} draws={draws} />
      {table ? <ChartTable props={props} /> : null}
    </View>
  );
}
