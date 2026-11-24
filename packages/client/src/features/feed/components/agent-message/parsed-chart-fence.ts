import { validateChartFence } from '@repo/contracts/chart-fence';
import { LRUCache } from 'lru-cache';

type ChartFence = ReturnType<typeof validateChartFence>;

// Enough for the charts a Feed holds.
const parsedFences = new LRUCache<string, ChartFence>({ max: 100 });

/*
 * A row draws its chart on every render and again when it remounts or is recycled, so a fence is parsed once
 * rather than each time.
 */
// `validate` is the parser, which a test passes its own to count.
export function parsedChartFence(
  raw: string,
  validate: typeof validateChartFence = validateChartFence,
): ChartFence {
  const known = parsedFences.get(raw);

  if (known) return known;

  const parsed = validate(raw);
  parsedFences.set(raw, parsed);

  return parsed;
}
