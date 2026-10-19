import type { Bounds, Point } from './canvas-props';

export const drawingOrigin = (props: { x?: number; y?: number }): Point => ({
  x: props.x ?? 0,
  y: props.y ?? 0,
});

export const emptyBounds: Bounds = { x: 0, y: 0, width: 0, height: 0 };

export const rectCorners = ({
  width,
  height,
}: Pick<Bounds, 'width' | 'height'>): Point[] => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: 0, y: height },
  { x: width, y: height },
];
