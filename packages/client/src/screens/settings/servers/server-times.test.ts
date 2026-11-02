import { describe, expect, it } from 'vitest';
import { dateLabel, whenLabel } from './server-times';

const now = new Date(2026, 10, 2, 14, 30).getTime();

const at = (month: number, day: number, time = [9, 12]): number =>
  new Date(2026, month, day, ...time).getTime();

describe('when a Server was last reached', () => {
  it('says the day as Today or Yesterday with the time', () => {
    expect(whenLabel(at(10, 2), now)).toBe('Today, 09:12');
    expect(whenLabel(at(10, 1, [18, 40]), now)).toBe('Yesterday, 18:40');
  });

  it('says an older day as a date', () => {
    expect(whenLabel(at(9, 3), now)).toBe('3 October');
  });

  it('adds the year to a date in another year', () => {
    expect(dateLabel(new Date(2025, 8, 28).getTime(), now)).toBe(
      '28 September 2025',
    );
  });
});
