import { describe, expect, it } from 'vitest';
import { badgeCountText } from './badge-count';

describe('badgeCountText', () => {
  it.each([
    [undefined, undefined],
    [0, undefined],
    [-2, undefined],
    [1, '1'],
    [99, '99'],
    [100, '99+'],
    [1250, '99+'],
  ])('draws a count of %s as %j', (count, expected) => {
    expect(badgeCountText(count)).toBe(expected);
  });
});
