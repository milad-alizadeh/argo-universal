import { type ReactElement, type ReactNode, useContext } from 'react';
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

const pressProps = (props: ChartProps): PressableProps => ({
  accessible: true,
  accessibilityLabel: props.label,
  accessibilityRole: props.onPress ? 'button' : 'image',
  onPress: props.onPress,
  style: stretch,
});

function ChartImage({
  props,
  children,
}: {
  props: ChartProps;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Pressable {...pressProps(props)}>
      {/* The Pressable names the chart; the drawing and its fallback would name it twice. */}
      <View aria-hidden style={stretch}>
        {children}
      </View>
    </Pressable>
  );
}

function LabelledDrawing({
  props,
  draws,
}: {
  props: ChartProps;
  draws: boolean;
}): React.JSX.Element {
  return draws ? (
    <CanvasBoundary label={props.label} source={props.series}>
      <ChartLoader {...props} />
    </CanvasBoundary>
  ) : (
    <CanvasFallback label={props.label} />
  );
}

// Data in, drawing out: Plugins never see Victory or Skia, so the renderer can change (ADR-0028).
export function Chart({
  fallback,
  ...props
}: ChartProps & { fallback?: ReactElement }): React.JSX.Element {
  const tile = useContext(ListTileContext);
  const draws = useSvgDrawing('skia');
  const table = useTableMounted();

  if (fallback && !draws) return fallback;

  // The table sits beside the labelled drawing: inside it, an image or button would hide the rows.
  const chart = (
    <View style={tile ? tileFrame : inlineFrame}>
      <ChartImage props={props}>
        {fallback ? (
          <ChartLoader {...props} />
        ) : (
          <LabelledDrawing props={props} draws={draws} />
        )}
      </ChartImage>
      {table ? <ChartTable props={props} /> : null}
    </View>
  );

  if (!fallback) return chart;

  return (
    <CanvasBoundary
      label={props.label}
      source={props.series}
      fallback={fallback}
    >
      {chart}
    </CanvasBoundary>
  );
}
