import { describe, expect, it } from 'vitest';
import {
  type ChartSeries,
  barSlots,
  cartesianData,
  chartTable,
  pieLegend,
  pieSlices,
  yDomain,
} from './chart-data';

const files: ChartSeries = {
  name: 'Files',
  tone: 'info',
  points: [
    { x: 2, y: 5 },
    { x: 1, y: 3 },
  ],
};

const tests: ChartSeries = {
  name: 'Tests',
  tone: 'success',
  points: [
    { x: 1, y: 4 },
    { x: 3, y: 1 },
  ],
};

describe('cartesianData', () => {
  it('joins every series on its x values, in order', () => {
    expect(cartesianData({ kind: 'line', series: [files, tests] })).toEqual({
      keys: ['s0', 's1'],
      rows: [
        { x: 1, s0: 3, s1: 4 },
        { x: 2, s0: 5, s1: null },
        { x: 3, s0: null, s1: 1 },
      ],
    });
  });

  it('counts a missing point as zero when series stack', () => {
    const data = cartesianData({
      kind: 'bar',
      stacked: true,
      series: [files, tests],
    });

    expect(data.rows).toEqual([
      { x: 1, s0: 3, s1: 4 },
      { x: 2, s0: 5, s1: 0 },
      { x: 3, s0: 0, s1: 1 },
    ]);
  });
});

describe('yDomain', () => {
  it('leaves lines and dots to the data range', () => {
    const line = { kind: 'line' as const, series: [files] };

    expect(yDomain(line, cartesianData(line))).toBeUndefined();
  });

  it('rises bars from zero to the tallest bar', () => {
    const bar = { kind: 'bar' as const, series: [files, tests] };

    expect(yDomain(bar, cartesianData(bar))).toEqual([0, 5]);
  });

  it('reaches the tallest stack, the sum of its series', () => {
    const stack = {
      kind: 'area' as const,
      stacked: true,
      series: [files, tests],
    };

    expect(yDomain(stack, cartesianData(stack))).toEqual([0, 7]);
  });

  it('reaches below zero for negative bars', () => {
    const loss: ChartSeries = {
      name: 'Loss',
      tone: 'danger',
      points: [{ x: 1, y: -4 }],
    };

    const bar = { kind: 'bar' as const, series: [loss] };

    expect(yDomain(bar, cartesianData(bar))).toEqual([-4, 0]);
  });
});

describe('barSlots', () => {
  it('gives each x a slot, half a step past the first and last bar', () => {
    const { rows } = cartesianData({ kind: 'bar', series: [files, tests] });

    expect(barSlots(rows)).toEqual({ x: [0.5, 3.5], count: 3 });
  });

  it('counts the slots of missing x values between bars', () => {
    const sparse: ChartSeries = {
      name: 'Sparse',
      tone: 'info',
      points: [
        { x: 0, y: 1 },
        { x: 2, y: 1 },
        { x: 8, y: 1 },
      ],
    };

    const { rows } = cartesianData({ kind: 'bar', series: [sparse] });

    expect(barSlots(rows)).toEqual({ x: [-1, 9], count: 5 });
  });

  it('gives a single bar one slot of width one', () => {
    const single = { ...tests, points: [{ x: 4, y: 2 }] };
    const { rows } = cartesianData({ kind: 'bar', series: [single] });

    expect(barSlots(rows)).toEqual({ x: [3.5, 4.5], count: 1 });
  });
});

describe('pieSlices', () => {
  it('draws one slice per series, sized by its total', () => {
    const empty: ChartSeries = { name: 'Docs', tone: 'muted', points: [] };

    expect(pieSlices([files, tests, empty])).toEqual([
      { key: 's0', name: 'Files', tone: 'info', value: 8 },
      { key: 's1', name: 'Tests', tone: 'success', value: 5 },
    ]);
  });

  it('leaves out negative values, which a slice cannot show', () => {
    const loss: ChartSeries = {
      name: 'Loss',
      tone: 'danger',
      points: [{ x: 1, y: -4 }],
    };

    expect(pieSlices([loss])).toEqual([]);
  });
});

describe('chartTable', () => {
  it('lists each x with every series value, and a dash for a gap', () => {
    expect(chartTable({ kind: 'line', series: [files, tests] })).toEqual({
      columns: ['x', 'Files', 'Tests'],
      rows: [
        ['1', '3', '4'],
        ['2', '5', '–'],
        ['3', '–', '1'],
      ],
    });
  });

  it('lists each pie slice with its total', () => {
    expect(chartTable({ kind: 'donut', series: [files, tests] })).toEqual({
      columns: ['Series', 'Total'],
      rows: [
        ['Files', '8'],
        ['Tests', '5'],
      ],
    });
  });
});

describe('pieLegend', () => {
  it('names each slice with its tone and share of the whole', () => {
    expect(pieLegend([files, tests])).toEqual([
      { key: 's0', name: 'Files', tone: 'info', percent: '62%' },
      { key: 's1', name: 'Tests', tone: 'success', percent: '38%' },
    ]);
  });

  it('leaves out a series with nothing to show', () => {
    expect(pieLegend([{ ...files, points: [] }, tests])).toHaveLength(1);
  });
});
