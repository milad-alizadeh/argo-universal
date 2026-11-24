import { validateChartFence } from '@repo/contracts/chart-fence';
import { expect, it, vi } from 'vitest';
import { parsedChartFence } from './parsed-chart-fence';

vi.mock('@repo/contracts/chart-fence', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@repo/contracts/chart-fence')>();

  return {
    ...actual,
    validateChartFence: vi.fn<typeof actual.validateChartFence>(
      actual.validateChartFence,
    ),
  };
});

const fence = '```chart\n{"type":"bar","data":[{"label":"A","value":1}]}\n```';

it('parses a fence once however often a row draws it', () => {
  const first = parsedChartFence(fence);

  expect(parsedChartFence(`${fence}`)).toBe(first);
  expect(validateChartFence).toHaveBeenCalledTimes(1);
});

it('keeps a fence that does not parse as not valid', () => {
  expect(parsedChartFence('```chart\nnot json\n```').valid).toBe(false);
});
