import { validateChartFence } from '@repo/contracts/chart-fence';
import type { OperationImplementations } from './operations';

const preview: OperationImplementations['chart.preview'] = async ({
  fence,
}) => {
  const result = validateChartFence(fence);

  if (!result.valid) return result;

  return {
    valid: true,
    status: 'unavailable',
    reason: 'No desktop Chart renderer is available on this Server.',
  };
};

export const chartImplementations = { 'chart.preview': preview };
