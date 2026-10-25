import type { KitProps } from '../../kit-props';

export type ChartProps = KitProps<'Chart'>;

export type ChartSeries = ChartProps['series'][number];

export type ChartData = Pick<ChartProps, 'kind' | 'series' | 'stacked'>;

export type SeriesKey = `s${number}`;

export type ChartRow = { x: number } & Record<SeriesKey, number | null>;

export interface CartesianData {
  keys: SeriesKey[];
  rows: ChartRow[];
}

export const seriesKey = (index: number): SeriesKey => `s${index}`;

const byX = (a: ChartRow, b: ChartRow): number => a.x - b.x;

type RowMap = Map<number, ChartRow>;

type Blank = (x: number) => ChartRow;

type Point = ChartSeries['points'][number];

function collectRows(series: readonly ChartSeries[], blank: Blank): RowMap {
  const rows: RowMap = new Map();

  const place = (index: number, { x, y }: Point): void => {
    const row = rows.get(x) ?? blank(x);

    row[seriesKey(index)] = y;
    rows.set(x, row);
  };

  for (const [index, { points }] of series.entries())
    for (const point of points) place(index, point);

  return rows;
}

// Victory reads one row per x; a series without a point at that x leaves a gap, or adds nothing to a stack.
export function cartesianData({ series, stacked }: ChartData): CartesianData {
  const keys = series.map((_, index) => seriesKey(index));
  const missing = stacked ? 0 : null;
  const rows = collectRows(series, (x) => emptyRow(x, keys, missing));

  return { keys, rows: [...rows.values()].sort(byX) };
}

const isFlat = (kind: ChartProps['kind']): boolean =>
  kind === 'line' || kind === 'scatter';

const stackSum = (values: number[], sign: number): number =>
  values.reduce((total, value) => total + (value * sign > 0 ? value : 0), 0);

function rowEnds(
  row: ChartRow,
  keys: SeriesKey[],
  stacked: boolean | undefined,
): number[] {
  const values = keys.map((key) => row[key] ?? 0);

  return stacked ? [stackSum(values, 1), stackSum(values, -1)] : values;
}

// Stacks and bars rise from zero, and a stack reaches the sum of its series, which Victory's own domain does not count.
export function yDomain(
  { kind, stacked }: ChartData,
  { keys, rows }: CartesianData,
): [number, number] | undefined {
  if (isFlat(kind)) return undefined;

  const ends = rows.flatMap((row) => rowEnds(row, keys, stacked));
  const low = Math.min(0, ...ends);
  const high = Math.max(0, ...ends);

  return [low, high > low ? high : low + 1];
}

export interface BarSlots {
  x: [number, number];
  count: number;
}

const smallestStep = (xs: number[]): number => {
  const gaps = xs.slice(1).map((x, index) => x - (xs[index] ?? x));

  return gaps.length > 0 ? Math.min(...gaps) : 1;
};

// Victory sizes a bar by the domain over a slot count; half a step past each end keeps the first and last bar whole.
export function barSlots(rows: readonly ChartRow[]): BarSlots {
  const xs = rows.map(({ x }) => x);
  const first = xs[0] ?? 0;
  const last = xs.at(-1) ?? first;
  const step = smallestStep(xs);

  return {
    x: [first - step / 2, last + step / 2],
    count: Math.round((last - first) / step) + 1,
  };
}

function emptyRow(
  x: number,
  keys: SeriesKey[],
  missing: number | null,
): ChartRow {
  const row: ChartRow = { x };

  for (const key of keys) row[key] = missing;

  return row;
}

export interface PieSlice {
  key: SeriesKey;
  name: string;
  tone: ChartSeries['tone'];
  value: number;
}

// A pie or donut gives each series one slice, the sum of its points.
export function pieSlices(series: readonly ChartSeries[]): PieSlice[] {
  return series.flatMap(({ name, tone, points }, index): PieSlice[] => {
    const value = points.reduce((total, { y }) => total + Math.max(y, 0), 0);

    return value > 0 ? [{ key: seriesKey(index), name, tone, value }] : [];
  });
}

export interface PieLegendRow {
  key: SeriesKey;
  name: string;
  tone: ChartSeries['tone'];
  percent: string;
}

const share = new Intl.NumberFormat(undefined, { style: 'percent' });

// One row per drawn slice, with its share of the whole as the sighted reader's value.
export function pieLegend(series: readonly ChartSeries[]): PieLegendRow[] {
  const slices = pieSlices(series);
  const total = slices.reduce((sum, { value }) => sum + value, 0);

  return slices.map(({ key, name, tone, value }) => ({
    key,
    name,
    tone,
    percent: share.format(value / total),
  }));
}

export interface ChartTable {
  columns: string[];
  rows: string[][];
}

export const isPolar = (kind: ChartProps['kind']): boolean =>
  kind === 'pie' || kind === 'donut';

const gap = '–';

const formatValue = (value: number | null): string =>
  value === null ? gap : value.toLocaleString();

const pieTable = (series: readonly ChartSeries[]): ChartTable => ({
  columns: ['Series', 'Total'],
  rows: pieSlices(series).map(({ name, value }) => [name, formatValue(value)]),
});

function cartesianTable(data: ChartData): ChartTable {
  const { keys, rows } = cartesianData({ ...data, stacked: false });

  return {
    columns: ['x', ...data.series.map(({ name }) => name)],
    rows: rows.map((row) => [
      formatValue(row.x),
      ...keys.map((key) => formatValue(row[key] ?? null)),
    ]),
  };
}

// The text twin a screen reader reads in place of the drawing (ADR-0028).
export const chartTable = (data: ChartData): ChartTable =>
  isPolar(data.kind) ? pieTable(data.series) : cartesianTable(data);
