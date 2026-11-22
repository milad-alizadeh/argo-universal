import { chartAxes, chartLegend } from './chart-drawing-markers';

function labelsReady(root: HTMLElement): boolean {
  const legend = root.querySelector(`[data-testid="${chartLegend}"]`);
  const axes = root.querySelector(`[data-testid="${chartAxes}"]`);

  // A polar Chart may draw an empty legend when there are no positive slices.
  return legend !== null || Boolean(axes?.childElementCount);
}

export function isChartDrawingReady(root: HTMLElement): boolean {
  const canvas = root.querySelector('canvas');

  if (!canvas?.width || !canvas.height || !labelsReady(root)) return false;

  const { width, height } = canvas.getBoundingClientRect();

  return width > 0 && height > 0;
}
