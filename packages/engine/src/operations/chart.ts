import { validateChartFence } from '@repo/contracts/chart-fence';
import {
  defaultChartPreviewTheme,
  defaultChartPreviewWidth,
} from '@repo/contracts/operations/chart';
import type { ChartPreview } from '../chart-preview';
import type { OperationImplementations } from './operations';

export function createChartOperations(
  chartPreview: ChartPreview,
): Pick<OperationImplementations, 'chart.preview'> {
  return {
    'chart.preview': async ({
      fence,
      width = defaultChartPreviewWidth,
      theme = defaultChartPreviewTheme,
    }) => {
      const result = validateChartFence(fence);

      if (!result.valid) return result;

      const answer = await chartPreview.render({ fence, width, theme });

      return answer.status === 'captured'
        ? { valid: true, ...answer, platform: 'web', width, theme }
        : { valid: true, ...answer };
    },
  };
}
