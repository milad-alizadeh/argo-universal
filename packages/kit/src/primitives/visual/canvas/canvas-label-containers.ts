import { drawingOrigin } from './canvas-geometry';
import type { Matrix } from './canvas-matrix';
import type { Bounds, CanvasDrawing, Point, RectProps } from './canvas-props';
import type { SceneEntry } from './canvas-scene-types';

export type TextEntry = SceneEntry & {
  drawing: Extract<CanvasDrawing, { kind: 'text' }>;
};

export const isTextEntry = (entry: SceneEntry): entry is TextEntry =>
  entry.drawing.kind === 'text';

// A rectangle's own bounds, before its group's matrix, which is what a text inside it is measured against.
function localBounds(props: RectProps): Bounds {
  return {
    ...drawingOrigin(props),
    width: props.width,
    height: props.height,
  };
}

function spans(value: number, start = 0, extent: number): boolean {
  return value >= start && value <= start + extent;
}

/*
 * Whether the rectangle holds the point, read straight off its props. Every text tries every
 * shape, so a scene of thousands runs this tens of thousands of times: it allocates nothing.
 */
const holdsPoint = (props: RectProps, point: Point): boolean =>
  spans(point.x, props.x, props.width) && spans(point.y, props.y, props.height);

const rectOf = (
  candidate: SceneEntry,
  matrix: Matrix,
): RectProps | undefined =>
  candidate.drawing.kind === 'rect' && candidate.matrix === matrix
    ? candidate.drawing.props
    : undefined;

function heldRect(
  candidate: SceneEntry,
  matrix: Matrix,
  point: Point,
): RectProps | undefined {
  const props = rectOf(candidate, matrix);

  return props && holdsPoint(props, point) ? props : undefined;
}

// The last rectangle holding the text wins, so a tile beats the folder drawn under it.
function lastHolder(
  entry: TextEntry,
  entries: SceneEntry[],
  point: Point,
): RectProps | undefined {
  let held: RectProps | undefined;

  for (const candidate of entries)
    held = heldRect(candidate, entry.matrix, point) ?? held;

  return held;
}

function containerOf(entry: TextEntry, entries: SceneEntry[]): Bounds {
  const point = drawingOrigin(entry.drawing.props);
  const holder = lastHolder(entry, entries, point);

  return holder ? localBounds(holder) : unbounded(point);
}

// A text no rectangle holds is measured against all the room there is.
export const unbounded = (point: Point): Bounds => ({
  ...point,
  width: Number.MAX_SAFE_INTEGER,
  height: Number.MAX_SAFE_INTEGER,
});

/*
 * Which rectangle each text sits in, found once for the whole scene. It does not move with the
 * camera, and finding it costs a pass over every shape, so a scene of thousands cannot find it
 * again on each frame.
 */
export function assignLabelContainers(entries: SceneEntry[]): void {
  for (const entry of entries)
    if (isTextEntry(entry)) entry.container = containerOf(entry, entries);
}
