import type { ChartPreviewBounds } from '@repo/contracts/operations/chart';
import { isChartDrawingReady } from '@repo/kit/primitives/visual';

export const chartPreviewRootId = 'chart-preview';

const nextFrame = (): Promise<number> =>
  new Promise((resolve) => requestAnimationFrame(resolve));

function measuredChart(): ChartPreviewBounds | null {
  const root = document.getElementById(chartPreviewRootId);

  if (!root || !isChartDrawingReady(root)) return null;

  const frame = root.getBoundingClientRect();

  return frame.width > 0 && frame.height > 0 ? crop(frame) : null;
}

function crop(bounds: DOMRect): ChartPreviewBounds {
  const x = Math.floor(bounds.left);
  const y = Math.floor(bounds.top);

  return {
    x,
    y,
    width: Math.ceil(bounds.right) - x,
    height: Math.ceil(bounds.bottom) - y,
  };
}

// Desktop owns the deadline and disposes this document when the deadline expires.
export async function awaitChartDrawing(): Promise<ChartPreviewBounds | null> {
  while (!measuredChart()) await nextFrame();
  await document.fonts.ready;
  await nextFrame();
  await nextFrame();

  return measuredChart();
}
