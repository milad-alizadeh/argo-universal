import { expect, it } from 'vitest';
import { activityStep, steppedActivityAt } from './activity-step';

it('keeps the last activity while a Turn streams inside one step', (): void => {
  const start = 1_000_000;

  const times = [0, 1, 5_000, activityStep - 1].map((offset): number =>
    steppedActivityAt(start, start + offset),
  );

  expect(times).toEqual([start, start, start, start]);
});

it('moves to now once a step has passed, and on the first change of a Session', (): void => {
  expect(steppedActivityAt(1_000, 1_000 + activityStep)).toBe(
    1_000 + activityStep,
  );
  const epochNow = 1_700_000_000_000;
  expect(steppedActivityAt(0, epochNow)).toBe(epochNow);
});
