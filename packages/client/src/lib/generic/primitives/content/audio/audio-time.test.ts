import { expect, it } from 'vitest';
import { clockTime } from './audio-time';

it.each([
  [0, '0:00'],
  [7.9, '0:07'],
  [192, '3:12'],
  [3725, '1:02:05'],
  [-1, '0:00'],
])('writes %d seconds as %s', (seconds, clock) => {
  expect(clockTime(seconds)).toBe(clock);
});
