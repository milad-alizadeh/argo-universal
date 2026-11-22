import { validateChartFence } from '@repo/contracts/chart-fence';
import type { MarkdownFence } from '@repo/kit/primitives/content/markdown';
import { Chart } from '@repo/kit/primitives/visual';

export function renderChartFence({
  language,
  raw,
  fallback,
}: MarkdownFence): React.JSX.Element | null {
  if (language?.trim().toLowerCase() !== 'chart') return null;

  const chart = validateChartFence(raw);

  return chart.valid ? <Chart {...chart.data} fallback={fallback} /> : null;
}
