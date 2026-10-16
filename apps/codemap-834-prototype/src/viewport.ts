/*
 * One camera interface for both CodeMap views. The flat view fills it with an orthographic adapter,
 * the 3D view with a perspective adapter over three.js. The shell only ever calls this interface.
 */

export type CameraAction = 'fit' | 'in' | 'out';

export interface ScreenPoint {
  x: number;
  y: number;
}

/** A point on the map: x and y in the treemap plane, elevation above it. */
export interface MapPoint {
  x: number;
  y: number;
  elevation?: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Viewport {
  /** Frames the whole map extent. */
  fit: () => void;
  /** Zooms in by a factor above 1 and out below 1, clamped to `zoomLimits`. */
  zoom: (factor: number) => void;
  /** Moves the map content by a screen delta in pixels. */
  pan: (delta: ScreenPoint) => void;
  /** Projects a map point to viewport pixels, or none when it is outside the view volume. */
  toScreen: (point: MapPoint) => ScreenPoint | undefined;
  /** Returns the id of the file drawn at a viewport pixel, or none. */
  pick: (point: ScreenPoint) => string | undefined;
}

/** Zoom levels relative to the fit pose. */
export const zoomLimits = { min: 0.2, max: 12 };

const zoomStep = 1.25;

const zoomFactors = { in: zoomStep, out: 1 / zoomStep };

export function clampZoom(level: number): number {
  return Math.min(zoomLimits.max, Math.max(zoomLimits.min, level));
}

function apply(viewport: Viewport, action: CameraAction): void {
  if (action === 'fit') {
    viewport.fit();

    return;
  }

  viewport.zoom(zoomFactors[action]);
}

/** Runs a camera button against whichever view currently fills the handle. */
export function runCamera(
  viewport: Viewport | null,
  action: CameraAction,
): void {
  if (viewport) apply(viewport, action);
}
