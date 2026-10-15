import { describe, expect, it } from 'vitest';
import { formatAge, formatElapsed } from './format-elapsed';

describe('formatElapsed', () => {
  it.each([
    [0, '0s'],
    [3_400, '3s'],
    [41_000, '41s'],
    [59_999, '59s'],
    [60_000, '1m 00s'],
    [63_000, '1m 03s'],
    [134_000, '2m 14s'],
    [3_599_000, '59m 59s'],
    [3_600_000, '1h 00m'],
    [3_725_000, '1h 02m'],
  ])('shows %i ms as %s', (milliseconds, text) => {
    expect(formatElapsed(milliseconds)).toBe(text);
  });

  it('shows a clock running behind the Turn start as 0s', () => {
    expect(formatElapsed(-2_000)).toBe('0s');
  });
});

describe('formatAge', () => {
  it.each([
    [-2_000, 'now'],
    [59_999, 'now'],
    [60_000, '1m'],
    [3_599_000, '59m'],
    [3_600_000, '1h'],
    [86_399_000, '23h'],
    [86_400_000, '1d'],
    [604_799_000, '6d'],
    [604_800_000, '1w'],
    [3_628_800_000, '6w'],
  ])('shows %i ms ago as %s', (milliseconds, text) => {
    expect(formatAge(milliseconds)).toBe(text);
  });
});
