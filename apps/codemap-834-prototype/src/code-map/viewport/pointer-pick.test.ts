import { describe, expect, it } from 'vitest';
import { isPress } from './pointer-pick';

describe('pointer press', () => {
  it.each([
    ['a release where it went down', { x: 100, y: 100 }, true],
    ['a release 4 px away', { x: 104, y: 100 }, true],
    ['a drag of 5 px', { x: 103, y: 104 }, false],
    ['a long drag', { x: 160, y: 40 }, false],
  ])('treats %s as a press: %s', (_, up, press) => {
    expect(isPress({ x: 100, y: 100 }, up)).toBe(press);
  });
});
