import { validateChartFence } from '@repo/contracts/chart-fence';
import { LRUCache } from 'lru-cache';

type ChartFence = ReturnType<typeof validateChartFence>;

// Enough for the charts a Feed holds.
const parsedFences = new LRUCache<string, ChartFence>({ max: 100 });

/*
 * A row draws its chart on every render and again when it remounts or is recycled, so a fence is parsed once
 * rather than each time.
 */
export function parsedChartFence(raw: string): ChartFence {
  const known = parsedFences.get(raw);

  if (known) return known;

  const parsed = validateChartFence(raw);
  parsedFences.set(raw, parsed);

  return parsed;
}
