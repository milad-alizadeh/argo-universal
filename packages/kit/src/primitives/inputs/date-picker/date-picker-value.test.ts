import { describe, expect, it } from 'vitest';
import { isoValue, valueDate } from './date-picker-value';

describe('DatePicker values', () => {
  it.each([
    ['date', '2026-10-19'],
    ['time', '14:30'],
    ['datetime', '2026-10-19T14:30'],
  ] as const)('round-trips a %s value through a local Date', (mode, value) => {
    const date = valueDate(value, mode);

    expect(date && isoValue(date, mode)).toBe(value);
  });

  it.each([
    ['date', ''],
    ['date', 'soon'],
    ['date', '2026-02-30'],
    ['time', '25:99'],
    ['time', '9:5'],
    ['datetime', '2026-10-19'],
    ['datetime', '2026-10-19T24:00'],
  ] as const)('reads no %s from %j', (mode, value) => {
    expect(valueDate(value, mode)).toBeUndefined();
  });
});
