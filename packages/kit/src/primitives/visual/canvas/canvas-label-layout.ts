import { screenPoint } from './canvas-camera';
import { drawingOrigin } from './canvas-geometry';
import { unbounded, type TextEntry } from './canvas-label-containers';
import type { LabelsProps } from './canvas-label-props';
import type { Bounds } from './canvas-props';

function availableSpace(
  entry: TextEntry,
  props: LabelsProps,
): Pick<Bounds, 'width' | 'height'> {
  const point = drawingOrigin(entry.drawing.props);
  const container = entry.container ?? unbounded(point);
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
