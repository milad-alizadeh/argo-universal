import { Box3, Ray, Vector3 } from 'three';
import type { Camera } from 'three';
import type { Tile } from './model';

const surfaceTolerance = 0.0001;

export type RoofVisibility = (roof: Vector3) => boolean;

interface OcclusionRay {
  ray: Ray;
  intersection: Vector3;
  distance: number;
}

function bounds(tile: Tile): Box3 {
  return new Box3(
    new Vector3(tile.x, 0, tile.y),
    new Vector3(tile.x + tile.w, tile.elevation, tile.y + tile.h),
  );
}

function aimAtRoof(ray: Ray, camera: Camera, roof: Vector3): number {
  camera.getWorldPosition(ray.origin);
  ray.direction.subVectors(roof, ray.origin).normalize();

  return ray.origin.distanceTo(roof) - surfaceTolerance;
}

function blocksRoof(box: Box3, ctx: OcclusionRay): boolean {
  const hit = ctx.ray.intersectBox(box, ctx.intersection);

  return hit !== null && ctx.ray.origin.distanceTo(hit) < ctx.distance;
}

export function createRoofVisibility(
  tiles: Tile[],
  camera: Camera,
): RoofVisibility {
  const boxes = tiles.map(bounds);
  const ctx = { ray: new Ray(), intersection: new Vector3(), distance: 0 };

  return (roof): boolean => {
    ctx.distance = aimAtRoof(ctx.ray, camera, roof);

    return !boxes.some((box) => blocksRoof(box, ctx));
  };
}
