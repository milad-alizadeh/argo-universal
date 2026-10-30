import { drawingFill, drawingOrigin, drawingStroke } from './canvas-geometry';
import type { Matrix } from './canvas-matrix';
import type { Bounds, CanvasDrawing, RectProps } from './canvas-props';

type RectDrawing = Extract<CanvasDrawing, { kind: 'rect' }>;

const squareCorners = (props: RectProps): boolean => !props.rx && !props.ry;

const filledOnly = (drawing: RectDrawing): boolean =>
  drawingFill(drawing) && !drawingStroke(drawing);

// Index 1 and 3 are the matrix's skew terms, which a turn or a skew makes non-zero.
const axisAligned = (matrix: Matrix): boolean =>
  matrix[1] === 0 && matrix[3] === 0;

function pathFree(drawing: RectDrawing, matrix: Matrix): boolean {
  if (!squareCorners(drawing.props)) return false;

  if (!filledOnly(drawing)) return false;

  return axisAligned(matrix);
}

/*
 * The scene bounds of a filled square-cornered rectangle no group turned or skewed, or nothing
 * when the shape needs a path. Its bounds are its own rectangle and a point hits it when those
 * bounds hold it, so a scene of thousands of them — a code map, a heatmap — pays for no paths.
 */
export function plainRectBounds(
  drawing: CanvasDrawing,
  matrix: Matrix,
): Bounds | undefined {
  if (drawing.kind !== 'rect') return undefined;

  if (!pathFree(drawing, matrix)) return undefined;

  return sized(rectBounds(drawing.props, matrix));
}

// A rectangle with no area keeps its path, whose bounds an empty rectangle leaves at the origin.
const sized = (bounds: Bounds): Bounds | undefined =>
  bounds.width > 0 && bounds.height > 0 ? bounds : undefined;

/*
 * The rectangle's two corners through the matrix, then read back as a rectangle: a group that
 * scales by a negative number flips them, and bounds run from the smaller corner.
 */
function rectBounds(props: RectProps, matrix: Matrix): Bounds {
  const origin = drawingOrigin(props);
  const [scaleX, , moveX, , scaleY, moveY] = matrix;
  const left = scaleX * origin.x + moveX;
  const top = scaleY * origin.y + moveY;
  const right = scaleX * (origin.x + props.width) + moveX;
  const bottom = scaleY * (origin.y + props.height) + moveY;

  return {
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    width: Math.abs(right - left),
    height: Math.abs(bottom - top),
  };
}
