import { expect, it } from 'vitest';
import { pageFloorMs, QueryIntervals } from './query-intervals';

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

  expect(intervals.page(atlas, '/runs', tooFast)).toBe(pageFloorMs);
  expect(intervals.page(atlas, '/runs', tooFast)).toBe(pageFloorMs);
  expect(lines).toHaveLength(1);
});

it('forgets the intervals it clamped for a Plugin that was released', () => {
  const { lines, intervals } = clamping();

  intervals.page(atlas, '/runs', tooFast);
  intervals.release(atlas);
  intervals.page(atlas, '/runs', tooFast);

  expect(lines).toHaveLength(2);
});
