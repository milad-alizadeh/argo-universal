import { describe, expect, it } from 'vitest';
import { rememberReadings, settleFailure } from './settle-failure';

describe('settleFailure', () => {
  it('says a clipped element is clipped, and that its top is stable', () => {
    const message = settleFailure(false, -726, -726);

    expect(message).toContain('No point on the element can be hit');
    expect(message).toContain('stable at -726');
    expect(message).not.toContain('moving');
  });

  it('says a moving element is moving, with where it went', () => {
    const message = settleFailure(true, -272, -127);

    expect(message).toContain('still moving');
    expect(message).toContain('-127');
    expect(message).toContain('-272');
    expect(message).not.toContain('hit');
  });

  it('says a clipped element that also moves is both', () => {
    const message = settleFailure(false, -272, -127);

    expect(message).toContain('No point on the element can be hit');
    expect(message).toContain('moved from -127 to -272');
  });

  it('names a first reading as having no earlier one', () => {
    expect(settleFailure(true, 40, undefined)).toContain('no reading');
  });
});

describe('rememberReadings', () => {
  it('gives back the reading before, and none for the first', () => {
    const remember = rememberReadings();

    expect(remember(5)).toBeUndefined();
    expect(remember(7)).toBe(5);
    expect(remember(7)).toBe(7);
  });
});
