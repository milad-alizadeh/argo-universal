import {
  Area,
  Bar,
  BarGroup,
  type ChartBounds,
  Line,
  type PointsArray,
  Scatter,
  StackedArea,
  StackedBar,
} from 'victory-native';
import { type ChartData, type ChartProps, seriesKey } from './chart-data';

export interface Plot {
  points: PointsArray[];
  zero: number;
  bounds: ChartBounds;
  barCount: number;
}

type Mark = (plot: Plot, colors: string[]) => React.ReactNode;

const areaOpacity = 0.24;

const scatterRadius = 3;

const lineWidth = 2;

const barCorners = { topLeft: 2, topRight: 2 };

// Victory's share of the plot each bar or group fills; the rest is the gap between them.
const barFill = 0.75;

const groupCount = (points: PointsArray[]): number => points[0]?.length ?? 0;

// BarGroup splits the plot by its groups, not by slots, so a sparse x would widen each group past its slot.
function groupPadding(points: PointsArray[], slots: number): number {
  const groups = groupCount(points);

  return groups > 0 ? 1 - (barFill * groups) / slots : 1 - barFill;
}

const lines: Mark = ({ points }, colors) =>
  points.map((series, index) => (
    <Line
      key={seriesKey(index)}
      points={series}
      color={colors[index]}
      strokeWidth={lineWidth}
      connectMissingData
    />
  ));

const scatter: Mark = ({ points }, colors) =>
  points.map((series, index) => (
    <Scatter
      key={seriesKey(index)}
      points={series}
      color={colors[index]}
      radius={scatterRadius}
    />
  ));

const areas: Mark = ({ points, zero }, colors) =>
  points.map((series, index) => (
    <Area
      key={seriesKey(index)}
      points={series}
      y0={zero}
      color={colors[index]}
      opacity={areaOpacity}
      connectMissingData
    />
  ));

const stackedAreas: Mark = ({ points, zero }, colors) => (
  <StackedArea points={points} y0={zero} colors={colors} />
);

function singleBar(
  { bounds, barCount }: Plot,
  only: PointsArray,
  color: string | undefined,
): React.ReactNode {
  return (
    <Bar
      points={only}
      chartBounds={bounds}
      barCount={barCount}
      color={color}
      roundedCorners={barCorners}
    />
  );
}

type BarElements = React.JSX.Element[];

const groupBars = (points: PointsArray[], colors: string[]): BarElements =>
  points.map((series, index) => (
    <BarGroup.Bar
      key={seriesKey(index)}
      points={series}
      color={colors[index]}
    />
  ));

function barGroup(
  { points, bounds, barCount }: Plot,
  colors: string[],
): React.ReactNode {
  return (
    <BarGroup
      chartBounds={bounds}
      betweenGroupPadding={groupPadding(points, barCount)}
      roundedCorners={barCorners}
    >
      {groupBars(points, colors)}
    </BarGroup>
  );
}

const bars: Mark = (plot, colors) => {
  const [only] = plot.points;

  return only && plot.points.length === 1
    ? singleBar(plot, only, colors[0])
    : barGroup(plot, colors);
};

const stackedBars: Mark = ({ points, bounds, barCount }, colors) => (
  <StackedBar
    points={points}
    chartBounds={bounds}
    barCount={barCount}
    colors={colors}
  />
);

// Pie and donut never reach these tables: they take the polar drawing instead.
const marks: Record<ChartProps['kind'], Mark> = {
  line: lines,
  scatter,
  area: areas,
  bar: bars,
  pie: lines,
  donut: lines,
};

const stackedMarks: Record<ChartProps['kind'], Mark> = {
  ...marks,
  area: stackedAreas,
  bar: stackedBars,
};

export const drawMarks = (
  { kind, stacked }: ChartData,
  plot: Plot,
  colors: string[],
): React.ReactNode => (stacked ? stackedMarks : marks)[kind](plot, colors);
