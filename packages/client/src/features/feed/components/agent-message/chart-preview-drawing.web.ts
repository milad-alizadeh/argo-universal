import type { ChartPreviewBounds } from '@repo/contracts/operations/chart';

export const chartPreviewRootId = 'chart-preview';

const nextFrame = (): Promise<number> =>
  new Promise((resolve) => requestAnimationFrame(resolve));

function chartLabelsReady(root: HTMLElement): boolean {
  // The legend mounts with its labels. It has no rows when there are no positive pie slices.
  const legend = root.querySelector('[data-testid="chart-legend"]');
  const axes = root.querySelector('[data-testid="chart-axes"]');

  return legend !== null || Boolean(axes?.childElementCount);
}

function measuredChart(): ChartPreviewBounds | null {
  const root = document.getElementById(chartPreviewRootId);
  const canvas = root?.querySelector('canvas');

  if (!root || !canvas?.width || !canvas.height || !chartLabelsReady(root))
    return null;

  const frame = root.getBoundingClientRect();
  const plot = canvas.getBoundingClientRect();

  if (
    plot.width <= 0 ||
    plot.height <= 0 ||
    frame.width <= 0 ||
    frame.height <= 0
  )
    return null;

  return crop(frame);
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
