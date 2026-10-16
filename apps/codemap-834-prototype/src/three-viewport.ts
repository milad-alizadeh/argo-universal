import { Vector3, type PerspectiveCamera } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Bounds, Tile } from './model';
import {
  fitCamera,
  panShift,
  pickTile,
  poseDistance,
  projectPoint,
  type CameraPose,
  type Vec3,
} from './three-projection';
import {
  clampZoom,
  zoomLimits,
  type ScreenPoint,
  type Size,
  type Viewport,
} from './viewport';

export interface ThreeScene {
  tiles: Tile[];
  extent: Bounds;
}

export interface ThreeRig {
  camera: PerspectiveCamera;
  controls: Pick<
    OrbitControls,
    'target' | 'update' | 'minDistance' | 'maxDistance'
  >;
  invalidate: () => void;
}

export interface ThreeViewport extends Viewport {
  /** The current camera as plain numbers, read from its position and target, never its matrices. */
  pose: () => CameraPose;
  resize: (size: Size) => void;
}

interface State {
  scene: ThreeScene;
  rig: ThreeRig;
  size: Size;
  fitDistance: number;
}

function vector(point: Vec3): Vector3 {
  return new Vector3(point.x, point.y, point.z);
}

function pose({ rig, size }: State): CameraPose {
  const { position, fov } = rig.camera;
  const { target } = rig.controls;

  return {
    position: { x: position.x, y: position.y, z: position.z },
    target: { x: target.x, y: target.y, z: target.z },
    fov,
    size,
  };
}

function settle(rig: ThreeRig): void {
  rig.controls.update();
  rig.invalidate();
}

function fit(state: State): void {
  const { position, target } = fitCamera(state.scene.extent);
  state.rig.camera.position.set(position.x, position.y, position.z);
  state.rig.controls.target.set(target.x, target.y, target.z);
  settle(state.rig);
}

function zoom(state: State, factor: number): void {
  const { camera, controls } = state.rig;
  const offset = camera.position.clone().sub(controls.target);
  const level = clampZoom((state.fitDistance / offset.length()) * factor);
  camera.position
    .copy(controls.target)
    .addScaledVector(offset.normalize(), state.fitDistance / level);
  settle(state.rig);
}

function pan(state: State, delta: ScreenPoint): void {
  const shift = vector(panShift(pose(state), delta));
  state.rig.camera.position.add(shift);
  state.rig.controls.target.add(shift);
  settle(state.rig);
}

function resize(state: State, size: Size): void {
  state.size = size;
}

function limit(state: State): void {
  state.rig.controls.minDistance = state.fitDistance / zoomLimits.max;
  state.rig.controls.maxDistance = state.fitDistance / zoomLimits.min;
}

function camera(state: State): Pick<ThreeViewport, 'fit' | 'zoom' | 'pan'> {
  return {
    fit: () => fit(state),
    zoom: (factor) => zoom(state, factor),
    pan: (delta) => pan(state, delta),
  };
}

function projection(
  state: State,
): Pick<ThreeViewport, 'toScreen' | 'pick' | 'pose' | 'resize'> {
  return {
    toScreen: (point) => projectPoint(pose(state), point),
    pick: (point) => pickTile(pose(state), state.scene.tiles, point),
    pose: () => pose(state),
    resize: (size) => resize(state, size),
  };
}

/** A perspective viewport over a three.js camera and its orbit controls; call `fit` once mounted. */
export function createThreeViewport(
  scene: ThreeScene,
  rig: ThreeRig,
): ThreeViewport {
  const fitDistance = poseDistance(fitCamera(scene.extent));
  const size = { width: 1, height: 1 };
  const state: State = { scene, rig, size, fitDistance };
  limit(state);

  return { ...camera(state), ...projection(state) };
}
