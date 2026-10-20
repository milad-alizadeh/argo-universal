import { describe, expect, it } from 'vitest';
import { dragThreshold, isPress } from './pointer-pick';

describe('pointer press', () => {
  it.each([
    ['a release where it went down', { x: 100, y: 100 }, true],
    [
      'a release just inside the threshold',
      { x: 100 + dragThreshold - 1, y: 100 },
      true,
    ],
    [
      'a drag of exactly the threshold',
      { x: 100, y: 100 + dragThreshold },
      false,
    ],
    [
      'a diagonal drag of exactly the threshold',
      { x: 100 + dragThreshold * 0.6, y: 100 + dragThreshold * 0.8 },
      false,
    ],
    ['a long drag', { x: 160, y: 40 }, false],
  ])('treats %s as a press: %s', (_, up, press) => {
    expect(isPress({ x: 100, y: 100 }, up)).toBe(press);
  });
});
