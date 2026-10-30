import { Skia, type SkPath } from '@shopify/react-native-skia';
import { drawingOrigin } from './canvas-geometry';
import { canvasMatrix, type Matrix } from './canvas-matrix';
import type { CanvasDrawing, GroupProps, RectProps } from './canvas-props';

const degreesPerHalfTurn = 180;

const translate = (props: GroupProps): [number, number] =>
  props.translate ?? [0, 0];

const radians = (props: GroupProps): number =>
  ((props.rotate ?? 0) * Math.PI) / degreesPerHalfTurn;

function scaling(scale: GroupProps['scale']): [number, number] {
  if (Array.isArray(scale)) return scale;
  const value = scale ?? 1;

  return [value, value];
}

export function groupMatrix(props: GroupProps, parent: Matrix): Matrix {
  const [x, y] = translate(props);
  const [sx, sy] = scaling(props.scale);

  const matrix = Skia.Matrix(parent)
    .translate(x, y)
    .rotate(radians(props))
    .scale(sx, sy);

  try {
    return canvasMatrix.parse(matrix.get());
  } finally {
    matrix.dispose();
  }
}

const radiusX = (props: RectProps): number => props.rx ?? props.ry ?? 0;

function rectPath(props: RectProps): SkPath {
  const point = drawingOrigin(props);
  const rect = Skia.XYWHRect(point.x, point.y, props.width, props.height);
  const rx = radiusX(props);

  return Skia.Path.RRect(Skia.RRectXY(rect, rx, props.ry ?? rx));
}

function svgPath(d: string): SkPath {
  const path = Skia.Path.MakeFromSVGString(d);

  if (!path) throw new Error('Canvas path could not be drawn');

  return path;
}

export function drawingPath(drawing: CanvasDrawing): SkPath | undefined {
  return areaPath(drawing) ?? segmentPath(drawing);
}

function areaPath(drawing: CanvasDrawing): SkPath | undefined {
  if (drawing.kind === 'rect') return rectPath(drawing.props);

  if (drawing.kind === 'circle')
    return Skia.Path.Circle(
      drawing.props.cx,
      drawing.props.cy,
      drawing.props.r,
    );

  return undefined;
}

function segmentPath(drawing: CanvasDrawing): SkPath | undefined {
  if (drawing.kind === 'path') return svgPath(drawing.props.d);

  if (drawing.kind === 'line') return linePath(drawing.props);

  return undefined;
}

function linePath(
  props: Extract<CanvasDrawing, { kind: 'line' }>['props'],
): SkPath {
  return Skia.Path.Line(
    { x: props.x1, y: props.y1 },
    { x: props.x2, y: props.y2 },
  );
}
