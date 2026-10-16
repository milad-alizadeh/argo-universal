import type { LabelAnchors } from './map-labels';
import type { Tile } from './model';
import { hidden } from './three-occlusion';
import { projector, type CameraPose } from './three-projection';
import type { MapPoint, ScreenPoint } from './viewport';

type Project = (point: MapPoint) => ScreenPoint | undefined;

const halves = 2;

/** A roof narrower than this on screen is too small to label. */
const minimumWidth = 38;

/** A point across the roof at its middle depth: 0 is the left edge, 1 the right. */
function roof(tile: Tile, across: number): MapPoint {
  return {
    x: tile.x + tile.w * across,
    y: tile.y + tile.h / halves,
    elevation: tile.elevation,
  };
}

function wideEnough(
  centre: ScreenPoint,
  edge: ScreenPoint | undefined,
): boolean {
  return (
    edge !== undefined && Math.abs(centre.x - edge.x) * halves >= minimumWidth
  );
}

function anchor(tile: Tile, project: Project): ScreenPoint | undefined {
  const centre = project(roof(tile, 1 / halves));

  return centre && wideEnough(centre, project(roof(tile, 1)))
    ? centre
    : undefined;
}

/** 3D anchor rule: a label sits on its roof centre when the roof is wide enough and in plain sight. */
export function roofCentres(tiles: Tile[], pose: CameraPose): LabelAnchors {
  const project = projector(pose);

  return {
    anchor: (tile) => anchor(tile, project),
    exposed: (tile) => !hidden(pose.position, tiles, roof(tile, 1 / halves)),
  };
}
