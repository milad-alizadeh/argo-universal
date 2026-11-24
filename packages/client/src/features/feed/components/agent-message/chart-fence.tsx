import type { MarkdownFence } from '@repo/kit/primitives/content/markdown';
import { Chart } from '@repo/kit/primitives/visual';
import { parsedChartFence } from './parsed-chart-fence';

export function renderChartFence({
  language,
  raw,
  fallback,
}: MarkdownFence): React.JSX.Element | null {
  if (language?.trim().toLowerCase() !== 'chart') return null;

  const chart = parsedChartFence(raw);

  return chart.valid ? <Chart {...chart.data} fallback={fallback} /> : null;
}
