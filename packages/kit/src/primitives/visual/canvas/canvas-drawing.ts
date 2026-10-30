import { Skia, type SkPath } from '@shopify/react-native-skia';
import { drawingFill, drawingStroke } from './canvas-geometry';
import type { Matrix } from './canvas-matrix';
import type { CanvasDrawing } from './canvas-props';
import type { SceneEntry } from './canvas-scene-types';

const strokeWidth = (drawing: CanvasDrawing): number =>
  drawing.props.strokeWidth ?? 1;

export function hitPaths(
  path: SkPath,
  drawing: CanvasDrawing,
  matrix: Matrix,
): Pick<SceneEntry, 'fill' | 'stroke'> {
  const fill = drawingFill(drawing) ? transformedPath(path, matrix) : undefined;

  const stroke = drawingStroke(drawing)
    ? strokedPath(path, strokeWidth(drawing), matrix)
    : undefined;

  return { fill, stroke };
}

function transformedPath(path: SkPath, matrix: Matrix): SkPath {
  const builder = Skia.PathBuilder.MakeFromPath(path);

  try {
    return builder.transform(matrix).detach();
  } finally {
    builder.dispose();
  }
}

function strokedPath(
  path: SkPath,
  width: number,
  matrix: Matrix,
): SkPath | undefined {
  if (width === 0) return undefined;
  const stroke = Skia.Path.Stroke(path, { width });

  if (!stroke) return undefined;

  try {
    return transformedPath(stroke, matrix);
  } finally {
    stroke.dispose();
  }
}
