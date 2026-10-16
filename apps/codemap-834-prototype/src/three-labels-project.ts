import type { Label, Tile } from './model';
import { projectPoint, worldPoint, type CameraPose } from './three-projection';
import type { RoofVisibility } from './three-roof-visibility';
import type { ThreeViewport } from './three-viewport';
import type { MapPoint, ScreenPoint } from './viewport';

const halves = 2;

const minimumWidth = 38;

const maximumCandidates = 150;

interface Projection {
  pose: CameraPose;
  isRoofVisible: RoofVisibility;
}

function roof(tile: Tile, fraction: number): MapPoint {
  return {
    x: tile.x + tile.w * fraction,
    y: tile.y + tile.h / halves,
    elevation: tile.elevation,
  };
}

function fileName(tile: Tile): string {
  return tile.path.split('/').pop() ?? tile.path;
}

function wideEnough(
  center: ScreenPoint,
  edge: ScreenPoint | undefined,
): boolean {
  return (
    edge !== undefined && Math.abs(center.x - edge.x) * halves >= minimumWidth
  );
}

function anchor(tile: Tile, pose: CameraPose): ScreenPoint | undefined {
  const center = projectPoint(pose, roof(tile, 1 / halves));

  return center && wideEnough(center, projectPoint(pose, roof(tile, 1)))
    ? center
    : undefined;
}

function label(tile: Tile, ctx: Projection): Label | undefined {
  const center = anchor(tile, ctx.pose);

  if (!center || !ctx.isRoofVisible(worldPoint(roof(tile, 1 / halves)))) return;

  return { id: tile.id, text: fileName(tile), x: center.x, y: center.y };
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

interface LabelSource {
  viewport: Pick<ThreeViewport, 'pose'>;
  isRoofVisible: RoofVisibility;
}

/** Projects roof labels from the viewport's plain camera pose, so no camera matrix can be stale. */
export function projectLabels(tiles: Tile[], source: LabelSource): Label[] {
  const ctx = {
    pose: source.viewport.pose(),
    isRoofVisible: source.isRoofVisible,
  };

  const candidates: Label[] = [];

  for (const tile of tiles) {
    if (addCandidate(tile, candidates, ctx)) break;
  }

  return candidates;
}
