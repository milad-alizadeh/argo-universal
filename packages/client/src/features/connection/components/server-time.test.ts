import { describe, expect, it } from 'vitest';
import { formatServerClock, formatServerStart } from './server-time';

// Dates are built from local parts, so the expectations hold in any time zone.
function local(day: number, time: [number, number, number?]): string {
  return new Date(2026, 9, day, ...time).toISOString();
}

describe('formatServerClock', () => {
  it('shows the tick as a 24-hour local time', () => {
    expect(formatServerClock(local(3, [10, 0, 5]))).toMatch(/^10:00:05$/);
  });

  it('shows a placeholder before the first tick', () => {
    expect(formatServerClock()).toBe('…');
  });
});

describe('formatServerStart', () => {
  it('says Today when the Server started on the clock’s day', () => {
    expect(formatServerStart(local(3, [9, 0]), local(3, [10, 0]))).toBe(
      'Today at 09:00',
    );
  });

  it('names the day when the Server started earlier', () => {
    const started = formatServerStart(local(1, [9, 30]), local(3, [10, 0]));
    expect(started).toMatch(/1/);
    expect(started).toMatch(/ at 09:30$/);
    expect(started).not.toMatch(/^Today/);
  });

  it('names the day before the first clock tick', () => {
    expect(formatServerStart(local(3, [9, 0]))).toMatch(/ at 09:00$/);
    expect(formatServerStart(local(3, [9, 0]))).not.toMatch(/^Today/);
  });
});
