import { expect, it } from 'vitest';
import { mountedQueryFloorMs, QueryIntervals } from './query-intervals';

const atlas = 'atlas';

const tooFast = 1000;

type Clamping = { lines: string[]; intervals: QueryIntervals };

function clamping(): Clamping {
  const lines: string[] = [];

  return {
    lines,
    intervals: new QueryIntervals((line: string): void => {
      lines.push(line);
    }),
  };
}

it('writes one line however often a Plugin asks for the same fast interval', () => {
  const { lines, intervals } = clamping();

  expect(intervals.mounted(atlas, tooFast)).toBe(mountedQueryFloorMs);
  expect(intervals.mounted(atlas, tooFast)).toBe(mountedQueryFloorMs);
  expect(lines).toHaveLength(1);
});

it('forgets the intervals it clamped for a Plugin that was released', () => {
  const { lines, intervals } = clamping();

  intervals.mounted(atlas, tooFast);
  intervals.release(atlas);
  intervals.mounted(atlas, tooFast);

  expect(lines).toHaveLength(2);
});
