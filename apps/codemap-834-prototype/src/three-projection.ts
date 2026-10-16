/*
 * Pure perspective maths over a plain camera pose. The matrices are derived from the pose on every
 * call, so no stale three.js matrix can leak into a projection or a pick.
 * Map points sit in three.js world space as (x, elevation, y), with y up.
 */
import { Box3, Ray, Vector3 } from 'three';
import type { Bounds, Tile } from './model';
import type { MapPoint, ScreenPoint, Size } from './viewport';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  /** Vertical field of view in degrees, as three.js uses it. */
  fov: number;
  size: Size;
}

export const fieldOfView = 42;

export const clipRange = { near: 0.1, far: 1000 };

/** The fit camera sits this far from the extent centre, as ratios of the extent's longer side. */
export const fitOffset = { x: 0.95, y: 1, z: 1.15 };

const halves = 2;

const halfTurn = 180;

const worldUp = new Vector3(0, 1, 0);

interface Basis {
  origin: Vector3;
  forward: Vector3;
  right: Vector3;
  up: Vector3;
}

function vector(point: Vec3): Vector3 {
  return new Vector3(point.x, point.y, point.z);
}

export function worldPoint(point: MapPoint): Vector3 {
  return new Vector3(point.x, point.elevation ?? 0, point.y);
}

function basis(pose: CameraPose): Basis {
  const origin = vector(pose.position);
  const forward = vector(pose.target).sub(origin).normalize();
  const right = new Vector3().crossVectors(forward, worldUp).normalize();

  return {
    origin,
    forward,
    right,
    up: new Vector3().crossVectors(right, forward),
  };
}

/** Pixels per world unit at a depth of one unit along the view axis. */
function focalPixels(pose: CameraPose): number {
  const angle = (pose.fov * Math.PI) / halfTurn / halves;

  return pose.size.height / halves / Math.tan(angle);
}

function insideClip(depth: number): boolean {
  return depth >= clipRange.near && depth <= clipRange.far;
}

export function projectPoint(
  pose: CameraPose,
  point: MapPoint,
): ScreenPoint | undefined {
  const frame = basis(pose);
  const offset = worldPoint(point).sub(frame.origin);
  const depth = offset.dot(frame.forward);

  if (!insideClip(depth)) return;
  const scale = focalPixels(pose) / depth;

  return {
    x: pose.size.width / halves + offset.dot(frame.right) * scale,
    y: pose.size.height / halves - offset.dot(frame.up) * scale,
  };
}

export function screenRay(pose: CameraPose, point: ScreenPoint): Ray {
  const frame = basis(pose);
  const focal = focalPixels(pose);

  const direction = frame.forward
    .clone()
    .addScaledVector(frame.right, (point.x - pose.size.width / halves) / focal)
    .addScaledVector(frame.up, (pose.size.height / halves - point.y) / focal)
    .normalize();

  return new Ray(frame.origin, direction);
}

/** The world shift of camera and target that moves the content under the target by a screen delta. */
export function panShift(pose: CameraPose, delta: ScreenPoint): Vec3 {
  const frame = basis(pose);
  const units = poseDistance(pose) / focalPixels(pose);

  const shift = frame.right
    .multiplyScalar(-delta.x * units)
    .addScaledVector(frame.up, delta.y * units);

  return { x: shift.x, y: shift.y, z: shift.z };
}

function box(tile: Tile): Box3 {
  return new Box3(
    new Vector3(tile.x, 0, tile.y),
    new Vector3(tile.x + tile.w, tile.elevation, tile.y + tile.h),
  );
}

function hitDistance(ray: Ray, tile: Tile): number {
  const hit = ray.intersectBox(box(tile), new Vector3());

  return hit ? ray.origin.distanceTo(hit) : Infinity;
}

interface Hit {
  id?: string;
  distance: number;
}

/** The id of the nearest building the screen point's ray hits, or none. */
export function pickTile(
  pose: CameraPose,
  tiles: Tile[],
  point: ScreenPoint,
): string | undefined {
  const ray = screenRay(pose, point);

  const nearest = tiles.reduce<Hit>(
    (best, tile) => {
      const distance = hitDistance(ray, tile);

      return distance < best.distance ? { id: tile.id, distance } : best;
    },
    { distance: Infinity },
  );

  return nearest.id;
}

function centre(extent: Bounds): Vec3 {
  return {
    x: extent.x + extent.w / halves,
    y: 0,
    z: extent.y + extent.h / halves,
  };
}

/** The fit camera for an extent: above its centre, looking at it from the near corner. */
export function fitCamera(
  extent: Bounds,
): Pick<CameraPose, 'position' | 'target'> {
  const span = Math.max(extent.w, extent.h);
  const target = centre(extent);

  const position = {
    x: target.x + span * fitOffset.x,
    y: span * fitOffset.y,
    z: target.z + span * fitOffset.z,
  };

  return { position, target };
}

export function poseDistance(
  pose: Pick<CameraPose, 'position' | 'target'>,
): number {
  return vector(pose.position).distanceTo(vector(pose.target));
}
