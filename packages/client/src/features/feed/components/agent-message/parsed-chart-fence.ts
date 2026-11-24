import { validateChartFence } from '@repo/contracts/chart-fence';

type ChartFence = ReturnType<typeof validateChartFence>;

const parsedFences = new Map<string, ChartFence>();

// Enough for the charts a Feed holds; the oldest goes first.
const parsedFenceLimit = 100;

/*
 * A row draws its chart on every render and again when it remounts or is recycled, so a fence is parsed once
 * rather than each time.
 */
export function parsedChartFence(raw: string): ChartFence {
  const known = parsedFences.get(raw);

  if (known) return known;

  const parsed = validateChartFence(raw);
  parsedFences.set(raw, parsed);

  if (parsedFences.size > parsedFenceLimit)
    parsedFences.delete(parsedFences.keys().next().value ?? raw);

  return parsed;
}
