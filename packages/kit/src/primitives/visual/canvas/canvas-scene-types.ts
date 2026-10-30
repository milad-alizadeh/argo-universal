import type { SkCanvas, SkPaint } from '@shopify/react-native-skia';
import type { SkPath, SkPicture } from '@shopify/react-native-skia';
import type { NativeTheme } from '../../../native-theme';
import type { Matrix } from './canvas-matrix';
import type { Bounds, CanvasDrawing, Point } from './canvas-props';

export interface SceneEntry {
  key: string;
  address: string;
  drawing: CanvasDrawing;
  bounds: Bounds;
  matrix: Matrix;
  color?: string;
  fill?: SkPath;
  stroke?: SkPath;
  label?: string;
  onPress?: () => void;
  hitBounds?: Bounds;
  // For a text, the rectangle it sits in, found once when the scene is compiled.
  container?: Bounds;
}

export interface CanvasScene {
  entries: SceneEntry[];
  picture: SkPicture;
}

function within(value: number, start: number, extent: number): boolean {
  return value >= start && value <= start + extent;
}

export const inBounds = (point: Point, bounds: Bounds): boolean =>
  within(point.x, bounds.x, bounds.width) &&
  within(point.y, bounds.y, bounds.height);

export function entryAt(
  entries: SceneEntry[],
  point: Point,
): SceneEntry | undefined {
  return entries.findLast((entry) => hitsEntry(entry, point));
}

function hitsEntry(entry: SceneEntry, point: Point): boolean {
  if (entry.drawing.kind === 'text') return false;

  return inBounds(point, entry.bounds) && insideEntry(entry, point);
}

function insideEntry(entry: SceneEntry, point: Point): boolean {
  const paths = [entry.fill, entry.stroke].flatMap((path) =>
    path ? [path] : [],
  );

  return (
    paths.length === 0 || paths.some((path) => path.contains(point.x, point.y))
  );
}

export const entryKey = (entry: SceneEntry, key?: string): boolean =>
  entry.address === key || entry.key === key;

export function unionBounds(bounds: Bounds[]): Bounds {
  const x = Math.min(...bounds.map((rect) => rect.x));
  const y = Math.min(...bounds.map((rect) => rect.y));
  const right = Math.max(...bounds.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...bounds.map((rect) => rect.y + rect.height));

  return bounds.length
    ? { x, y, width: right - x, height: bottom - y }
    : { x: 0, y: 0, width: 0, height: 0 };
}

export { matrixPoint } from './canvas-matrix';

export interface SceneContext {
  canvas: SkCanvas;
  paint: SkPaint;
  theme: NativeTheme;
  entries: SceneEntry[];
}
