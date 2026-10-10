import { describe, expect, it } from 'vitest';
import { formatElapsed } from './format-elapsed';

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
