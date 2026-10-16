import { Vector3 } from 'three';
import type { Camera } from 'three';
import type { Label, Tile } from './model';
import type { RoofVisibility } from './three-roof-visibility';

const halves = 2;

const minimumWidth = 38;

const maximumCandidates = 150;

interface Projection {
  camera: Camera;
  size: { width: number; height: number };
  isRoofVisible: RoofVisibility;
}

function point(tile: Tile, fraction: number): Vector3 {
  return new Vector3(
    tile.x + tile.w * fraction,
    tile.elevation,
    tile.y + tile.h / halves,
  );
}

function insideDepth(point: Vector3): boolean {
  return point.z >= -1 && point.z <= 1;
}

function fileName(tile: Tile): string {
  return tile.path.split('/').pop() ?? tile.path;
}

function eligible(center: Vector3, edge: Vector3, width: number): boolean {
  return (
    insideDepth(center) && Math.abs(center.x - edge.x) * width >= minimumWidth
  );
}

function label(tile: Tile, ctx: Projection): Label | undefined {
  const center = point(tile, 1 / halves).project(ctx.camera);
  const edge = point(tile, 1).project(ctx.camera);

  if (!eligible(center, edge, ctx.size.width)) return;

  if (!ctx.isRoofVisible(point(tile, 1 / halves))) return;

  return {
    id: tile.id,
    text: fileName(tile),
    x: ((center.x + 1) * ctx.size.width) / halves,
    y: ((1 - center.y) * ctx.size.height) / halves,
  };
}

function addCandidate(
  tile: Tile,
  candidates: Label[],
  ctx: Projection,
): boolean {
  const candidate = label(tile, ctx);

  if (candidate) candidates.push(candidate);

  return candidates.length >= maximumCandidates;
}

export function projectLabels(tiles: Tile[], ctx: Projection): Label[] {
  // R3F projects labels before rendering refreshes the camera's world matrix.
  ctx.camera.updateMatrixWorld();
  const candidates: Label[] = [];

  for (const tile of tiles) {
    if (addCandidate(tile, candidates, ctx)) break;
  }

  return candidates;
}
