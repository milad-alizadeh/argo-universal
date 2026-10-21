import { Skia, type SkPath } from '@shopify/react-native-skia';
import { hitPaths } from './canvas-drawing';
import { drawingOrigin } from './canvas-geometry';
import { drawingPath } from './canvas-paths';
import type { CanvasDrawing } from './canvas-props';
import {
  matrixPoint,
  unionBounds,
  type SceneEntry,
  type SceneContext,
} from './canvas-scene-types';

export function leafEntry(
  entry: SceneEntry,
  context: SceneContext,
): SceneEntry {
  if (entry.drawing.kind === 'text')
    return textEntry(entry, entry.drawing.props);
  const path = drawingPath(entry.drawing);

  if (!path) return entry;

  try {
    return recordEntry(entry, context, path);
  } finally {
    path.dispose();
  }
}

function textEntry(
  entry: SceneEntry,
  props: Extract<CanvasDrawing, { kind: 'text' }>['props'],
): SceneEntry {
  const point = matrixPoint(drawingOrigin(props), entry.matrix);
  entry.bounds = { ...point, width: 0, height: 0 };
  entry.label ??= props.text;

  return entry;
}

function recordPath(entry: SceneEntry, context: SceneContext): void {
  if (!entry.color) return;
  context.paint.setColor(Skia.Color(entry.color));

  for (const path of pathLayers(entry))
    context.canvas.drawPath(path, context.paint);
}

export function disposeEntries(entries: SceneEntry[]): void {
  for (const entry of entries)
    for (const path of pathLayers(entry)) path.dispose();
}

function recordEntry(
  entry: SceneEntry,
  context: SceneContext,
  path: SkPath,
): SceneEntry {
  Object.assign(entry, hitPaths(path, entry.drawing, entry.matrix));
  entry.bounds = unionBounds(pathLayers(entry).map((hit) => hit.getBounds()));
  recordPath(entry, context);

  return entry;
}

function pathLayers(entry: SceneEntry): SkPath[] {
  return [entry.fill, entry.stroke].flatMap((path) => (path ? [path] : []));
}
