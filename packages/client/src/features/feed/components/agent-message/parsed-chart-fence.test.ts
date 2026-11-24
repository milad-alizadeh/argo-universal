import { expect, it } from 'vitest';
import { parsedChartFence } from './parsed-chart-fence';

const fence = '```chart\n{"type":"bar","data":[{"label":"A","value":1}]}\n```';

it('parses a fence once however often a row draws it', () => {
  expect(parsedChartFence(fence)).toBe(parsedChartFence(`${fence}`));
});

it('keeps a fence that does not parse as not valid', () => {
  expect(parsedChartFence('```chart\nnot json\n```').valid).toBe(false);
});
