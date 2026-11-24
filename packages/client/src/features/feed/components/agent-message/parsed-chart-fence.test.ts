import { validateChartFence } from '@repo/contracts/chart-fence';
import { expect, it } from 'vitest';
import { parsedChartFence } from './parsed-chart-fence';

const fence = '```chart\n{"type":"bar","data":[{"label":"A","value":1}]}\n```';

// The real parser, counted.
function countedParser(): {
  parses: () => number;
  validate: typeof validateChartFence;
} {
  let count = 0;

  return {
    parses: () => count,
    validate: (raw) => {
      count += 1;

      return validateChartFence(raw);
    },
  };
}

it('parses a fence once however often a row draws it', () => {
  const { parses, validate } = countedParser();
  const first = parsedChartFence(fence, validate);

  expect(parsedChartFence(`${fence}`, validate)).toBe(first);
  expect(parses()).toBe(1);
});

it('keeps a fence that does not parse as not valid', () => {
  expect(parsedChartFence('```chart\nnot json\n```').valid).toBe(false);
});
