import { screenPoint } from './canvas-camera';
import type { Bounds, Camera } from './canvas-props';
import type { SceneEntry } from './canvas-scene-types';

export function positionLabelBounds(
  entry: SceneEntry,
  view: Camera,
  bounds?: Bounds,
): Bounds | undefined {
  if (!bounds) return undefined;
  const point = screenPoint(entry.bounds, view);

  return { ...bounds, x: point.x + bounds.x, y: point.y + bounds.y };
}

function samePosition(a: Bounds, b: Bounds): boolean {
  return a.x === b.x && a.y === b.y;
}

function sameSize(a: Bounds, b: Bounds): boolean {
  return a.width === b.width && a.height === b.height;
}

function sameBounds(a?: Bounds, b?: Bounds): boolean {
  if (!a || !b) return a === b;

  return equalBounds(a, b);
}

export function updateLabelBounds(
  previous: Map<string, Bounds>,
  key: string,
  bounds?: Bounds,
): Map<string, Bounds> {
  if (sameBounds(previous.get(key), bounds)) return previous;
  const next = new Map(previous);

  if (bounds) next.set(key, bounds);
  else next.delete(key);

  return next;
}

function equalBounds(a: Bounds, b: Bounds): boolean {
  return samePosition(a, b) && sameSize(a, b);
}
