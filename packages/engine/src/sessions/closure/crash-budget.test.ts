import { expect, it } from 'vitest';
import { addCrash, exceedsCrashBudget } from './crash-budget';

const tenMinutes = 600_000;

it.each([
  { name: 'records a first crash', crashes: [], now: 5000, kept: [5000] },
  {
    name: 'keeps a crash inside the window',
    crashes: [1000],
    now: tenMinutes,
    kept: [1000, tenMinutes],
  },
  {
    name: 'drops a crash exactly ten minutes old',
    crashes: [1000],
    now: tenMinutes + 1000,
    kept: [tenMinutes + 1000],
  },
  {
    name: 'drops only the expired crashes',
    crashes: [0, 2000],
    now: tenMinutes + 1000,
    kept: [2000, tenMinutes + 1000],
  },
])('$name', ({ crashes, now, kept }): void => {
  expect(addCrash(crashes, now)).toEqual(kept);
});

it.each([
  {
    name: 'keeps the Agent with no recent crash',
    crashes: [],
    exceeded: false,
  },
  {
    name: 'keeps the Agent after two recent crashes',
    crashes: [1, 2],
    exceeded: false,
  },
  {
    name: 'gives up on the third recent crash',
    crashes: [1, 2, 3],
    exceeded: true,
  },
  {
    name: 'gives up past the third recent crash',
    crashes: [1, 2, 3, 4],
    exceeded: true,
  },
])('$name', ({ crashes, exceeded }): void => {
  expect(exceedsCrashBudget(crashes)).toBe(exceeded);
});
