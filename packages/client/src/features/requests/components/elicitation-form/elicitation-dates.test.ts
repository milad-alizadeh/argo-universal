import { describe, expect, it } from 'vitest';
import { instantOf, localDateTime } from './elicitation-dates';

describe('instantOf', () => {
  it('turns a local time into an instant', () => {
    expect(instantOf('2026-10-24T09:30')).toBe(
      new Date('2026-10-24T09:30').toISOString(),
    );
  });

  it('turns an empty or invalid time into an empty answer', () => {
    expect(instantOf('')).toBe('');
    expect(instantOf('not a date')).toBe('');
  });

  it('round-trips through the local time', () => {
    expect(instantOf(localDateTime('2026-10-24T09:30:00Z') ?? '')).toBe(
      '2026-10-24T09:30:00.000Z',
    );
  });
});
