import { expect, it } from 'vitest';
import { holdFor } from './hold-for';

it.each([
  [true, 0, 250],
  [true, 100, 150],
  [true, 250, 0],
  [true, 900, 0],
  [false, 0, 600],
  [false, 300, 300],
  [false, 600, 0],
  [false, 900, 0],
])('holds %j after %j ms for %j ms', (settled, elapsed, expected) => {
  expect(holdFor(1000, settled, 1000 + elapsed)).toBe(expected);
});
