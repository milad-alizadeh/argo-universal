import { View, type ViewStyle } from 'react-native';
import type { ChartBounds, Scale } from 'victory-native';
import { Text } from '#primitives/content/text';

export interface ChartScales {
  x: Scale;
  y: Scale;
}

interface Props {
  scales: ChartScales;
  bounds: ChartBounds;
  columns: number;
}

// A gutter left of the plot for y labels, and a line of x labels below it.
export const chartPadding = { top: 8, bottom: 24, left: 36, right: 16 };

const maxXLabels = 8;

// One label per x up to a handful, then d3's round steps.
export const xTickCount = (columns: number): number =>
  Math.min(columns, maxXLabels);

export const yTickCount = 4;

const labelWidth = 64;

const labelGap = 2;

const yLabelGap = 6;

const yLabelHeight = 20;

const tick = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const overlay = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
} as const;

function YLabels({
  scales,
  bounds,
}: Omit<Props, 'columns'>): React.JSX.Element {
  return (
    <>
      {scales.y.ticks(yTickCount).map((value: number) => (
        <View key={`y${value}`} style={yLabelAnchor(scales.y(value), bounds)}>
          <AxisLabel value={value} style={{ textAlign: 'right' }} />
        </View>
      ))}
    </>
  );
}

function XLabels({ scales, bounds, columns }: Props): React.JSX.Element {
  return (
    <>
      {scales.x.ticks(xTickCount(columns)).map((value: number) => (
        <View key={`x${value}`} style={xLabelBox(scales.x(value), bounds)}>
          <AxisLabel value={value} style={{ textAlign: 'center' }} />
        </View>
      ))}
    </>
  );
}

// System-font labels over the Skia plot (ADR-0028); each y label sits on its gridline.
export function ChartAxes(props: Props): React.JSX.Element {
  return (
    <View aria-hidden style={overlay}>
      <YLabels scales={props.scales} bounds={props.bounds} />
      <XLabels {...props} />
    </View>
  );
}

function AxisLabel({
  value,
  style,
}: {
  value: number;
  style: React.ComponentProps<typeof Text>['style'];
}): React.JSX.Element {
  return (
    <Text role="secondary" tone="muted" numberOfLines={1} style={style}>
      {tick.format(value)}
    </Text>
  );
}

function yLabelAnchor(y: number, bounds: ChartBounds): ViewStyle {
  return {
    position: 'absolute',
    top: y - yLabelHeight / 2,
    left: 0,
    width: bounds.left - yLabelGap,
    height: yLabelHeight,
    justifyContent: 'center',
  };
}

function xLabelBox(x: number, bounds: ChartBounds): ViewStyle {
  return {
    position: 'absolute',
    top: bounds.bottom + labelGap,
    left: x - labelWidth / 2,
    width: labelWidth,
  };
}
