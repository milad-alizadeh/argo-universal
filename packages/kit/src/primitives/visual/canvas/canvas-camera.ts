import type { Bounds, Camera, Point } from './canvas-props';

export const initialCamera: Camera = { x: 0, y: 0, scale: 1 };

const maxZoom = 64;

const zoomStep = 1.25;

const panStep = 40;

export function fitCamera(scene: Bounds, frame: Bounds): Camera {
  const scale = Math.min(
    frame.width / scene.width,
    frame.height / scene.height,
  );

  return {
    x: (frame.width - scene.width * scale) / 2,
    y: (frame.height - scene.height * scale) / 2,
    scale,
  };
}

export function zoomCamera(
  view: Camera,
  anchor: Point,
  factor: number,
): Camera {
  const scale = Math.min(maxZoom, Math.max(1, view.scale * factor));
  const ratio = scale / view.scale;

  return {
    scale,
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio,
  };
}

const panKeys = new Map([
  ['ArrowLeft', { x: panStep, y: 0 }],
  ['ArrowRight', { x: -panStep, y: 0 }],
  ['ArrowUp', { x: 0, y: panStep }],
  ['ArrowDown', { x: 0, y: -panStep }],
]);

export function keyCamera(
  key: string,
  view: Camera,
  anchor: Point,
): Camera | undefined {
  if (key === 'Home') return initialCamera;
  const shift = panKeys.get(key);

  return shift
    ? { ...view, x: view.x + shift.x, y: view.y + shift.y }
    : zoomKey(key, view, anchor);
}

const zoomKeys = new Map([
  ['+', zoomStep],
  ['=', zoomStep],
  ['-', 1 / zoomStep],
]);

function zoomKey(key: string, view: Camera, anchor: Point): Camera | undefined {
  const factor = zoomKeys.get(key);

  return factor ? zoomCamera(view, anchor, factor) : undefined;
}

export function sceneCamera(fit: Camera, view: Camera): Camera {
  return {
    x: fit.x * view.scale + view.x,
    y: fit.y * view.scale + view.y,
    scale: fit.scale * view.scale,
  };
}

export const screenPoint = (point: Point, view: Camera): Point => ({
  x: point.x * view.scale + view.x,
  y: point.y * view.scale + view.y,
});

export const worldPoint = (point: Point, view: Camera): Point => ({
  x: (point.x - view.x) / view.scale,
  y: (point.y - view.y) / view.scale,
});
