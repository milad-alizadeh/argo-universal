import type { Bounds, Tile } from '../model';
import {
  clampZoom,
  type MapPoint,
  type ScreenPoint,
  type Size,
  type Viewport,
} from '../viewport/viewport';

/** Screen offset in pixels and zoom level relative to fit. */
export interface FlatPose {
  x: number;
  y: number;
  zoom: number;
}

/** An immutable snapshot that changes whenever the view moves or resizes. */
export interface FlatFrame {
  size: Size;
  pose: FlatPose;
}

/** Screen = origin + map point × scale. */
export interface FlatTransform {
  x: number;
  y: number;
  scale: number;
}

export interface FlatScene {
  tiles: Tile[];
  extent: Bounds;
}

export interface FlatViewport extends Viewport {
  toScreen: (point: MapPoint) => ScreenPoint;
  toWorld: (point: ScreenPoint) => MapPoint;
  transform: () => FlatTransform;
  frame: () => FlatFrame;
  resize: (size: Size) => void;
  subscribe: (listener: () => void) => () => void;
}

/** The extent, grown by these ratios, fits the viewport. */
export const flatFitMargin = { x: 1.15, y: 1.25 };

const halves = 2;

const fitPose: FlatPose = { x: 0, y: 0, zoom: 1 };

interface State {
  scene: FlatScene;
  frame: FlatFrame;
  listeners: Set<() => void>;
}

function fitScale(extent: Bounds, size: Size): number {
  return Math.min(
    size.width / (extent.w * flatFitMargin.x),
    size.height / (extent.h * flatFitMargin.y),
  );
}

function transform({ scene, frame }: State): FlatTransform {
  const { extent } = scene;
  const scale = fitScale(extent, frame.size) * frame.pose.zoom;

  return {
    x:
      frame.size.width / halves +
      frame.pose.x -
      (extent.x + extent.w / halves) * scale,
    y:
      frame.size.height / halves +
      frame.pose.y -
      (extent.y + extent.h / halves) * scale,
    scale,
  };
}

function toScreen(state: State, point: MapPoint): ScreenPoint {
  const { x, y, scale } = transform(state);

  return { x: x + point.x * scale, y: y + point.y * scale };
}

function toWorld(state: State, point: ScreenPoint): MapPoint {
  const { x, y, scale } = transform(state);

  return { x: (point.x - x) / scale, y: (point.y - y) / scale };
}

function horizontal(tile: Tile, x: number): boolean {
  return x >= tile.x && x <= tile.x + tile.w;
}

function vertical(tile: Tile, y: number): boolean {
  return y >= tile.y && y <= tile.y + tile.h;
}

function contains(tile: Tile, point: MapPoint): boolean {
  return horizontal(tile, point.x) && vertical(tile, point.y);
}

function pick(state: State, point: ScreenPoint): string | undefined {
  const world = toWorld(state, point);

  // Later tiles draw on top, so the last hit is the visible one.
  return state.scene.tiles.findLast((tile) => contains(tile, world))?.id;
}

function update(state: State, frame: Partial<FlatFrame>): void {
  state.frame = { ...state.frame, ...frame };

  for (const listener of state.listeners) listener();
}

function move(state: State, change: Partial<FlatPose>): void {
  update(state, { pose: { ...state.frame.pose, ...change } });
}

function subscribe(state: State, listener: () => void): () => void {
  state.listeners.add(listener);

  return () => state.listeners.delete(listener);
}

function zoom(state: State, factor: number): void {
  move(state, { zoom: clampZoom(state.frame.pose.zoom * factor) });
}

function pan(state: State, delta: ScreenPoint): void {
  const { pose } = state.frame;
  move(state, { x: pose.x + delta.x, y: pose.y + delta.y });
}

function camera(state: State): Pick<FlatViewport, 'fit' | 'zoom' | 'pan'> {
  return {
    fit: () => update(state, { pose: fitPose }),
    zoom: (factor) => zoom(state, factor),
    pan: (delta) => pan(state, delta),
  };
}

function projection(
  state: State,
): Pick<FlatViewport, 'toScreen' | 'toWorld' | 'pick' | 'transform'> {
  return {
    toScreen: (point) => toScreen(state, point),
    toWorld: (point) => toWorld(state, point),
    pick: (point) => pick(state, point),
    transform: () => transform(state),
  };
}

function store(
  state: State,
): Pick<FlatViewport, 'frame' | 'resize' | 'subscribe'> {
  return {
    frame: () => state.frame,
    resize: (size) => update(state, { size }),
    subscribe: (listener) => subscribe(state, listener),
  };
}

/** A new flat viewport starts at fit. */
export function createFlatViewport(scene: FlatScene, size: Size): FlatViewport {
  const frame = { size, pose: fitPose };
  const state: State = { scene, frame, listeners: new Set() };

  return { ...camera(state), ...projection(state), ...store(state) };
}
