import { screenPoint } from './canvas-camera';
import { drawingOrigin } from './canvas-geometry';
import type { LabelsProps } from './canvas-label-props';
import type { Bounds, Point } from './canvas-props';
import type { CanvasDrawing } from './canvas-props';
import { inBounds, type SceneEntry } from './canvas-scene-types';

export type TextEntry = SceneEntry & {
  drawing: Extract<CanvasDrawing, { kind: 'text' }>;
};

export const isTextEntry = (entry: SceneEntry): entry is TextEntry =>
  entry.drawing.kind === 'text';

function localBounds(entry: SceneEntry): Bounds {
  const drawing = entry.drawing;

  if (drawing.kind !== 'rect') return entry.bounds;

  return {
    ...drawingOrigin(drawing.props),
    width: drawing.props.width,
    height: drawing.props.height,
  };
}

function matchingRect(
  candidate: SceneEntry,
  entry: TextEntry,
  point: Point,
): boolean {
  return (
    candidate.drawing.kind === 'rect' &&
    candidate.matrix === entry.matrix &&
    inBounds(point, localBounds(candidate))
  );
}

function containerOf(entry: TextEntry, entries: SceneEntry[]): Bounds {
  const point = drawingOrigin(entry.drawing.props);

  const containing = entries.findLast((candidate) =>
    matchingRect(candidate, entry, point),
  );

  return containing
    ? localBounds(containing)
    : {
        ...point,
        width: Number.MAX_SAFE_INTEGER,
        height: Number.MAX_SAFE_INTEGER,
      };
}

function availableSpace(
  entry: TextEntry,
  props: LabelsProps,
): Pick<Bounds, 'width' | 'height'> {
  const container = containerOf(entry, props.entries);
  const point = drawingOrigin(entry.drawing.props);
  const [a, c, , b, d] = entry.matrix;

  const width = (container.x + container.width - point.x) * Math.hypot(a, b);
  const height = (container.y + container.height - point.y) * Math.hypot(c, d);

  return { width: width * props.view.scale, height: height * props.view.scale };
}

export function labelBox(entry: TextEntry, props: LabelsProps): Bounds {
  const space = availableSpace(entry, props);
  const point = screenPoint(entry.bounds, props.view);

  return {
    ...point,
    width: Math.min(space.width, props.frame.width - point.x),
    height: Math.min(space.height, props.frame.height - point.y),
  };
}
