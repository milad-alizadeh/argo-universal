import { expect, it } from 'vitest';
import { chartProps } from './visual-props';

const series = { name: 'Files', tone: 'accent', points: [{ x: 0, y: 1 }] };

const chart = { kind: 'line', label: 'Files', series: [series] };

it('accepts a series whose points have distinct x values', () => {
  const points = [
    { x: 0, y: 1 },
    { x: 1, y: 2 },
  ];

  expect(
    chartProps.safeParse({ ...chart, series: [{ ...series, points }] }).success,
  ).toBe(true);
});

it('refuses a series that repeats an x value', () => {
  const points = [
    { x: 1, y: 1 },
    { x: 1, y: 2 },
  ];

  const result = chartProps.safeParse({
    ...chart,
    series: [{ ...series, points }],
  });

  expect(result.success).toBe(false);
  expect(result.error?.issues[0]?.message).toBe(
    'each series must use distinct x values',
  );
});

it('allows two series to share an x value', () => {
  const other = { ...series, name: 'Other', tone: 'success' };

  expect(
    chartProps.safeParse({ ...chart, series: [series, other] }).success,
  ).toBe(true);
});
