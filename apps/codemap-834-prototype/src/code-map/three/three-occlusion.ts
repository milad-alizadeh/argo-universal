/*
 * Pure occlusion over plain numbers: whether a building stands between the camera and a point.
 * Buildings are the tile boxes in three.js world space, (x, elevation, y) with y up.
 */
import type { Tile } from '../model';
import type { MapPoint } from '../viewport/viewport';
import type { Vec3 } from './three-projection';

/** The part of the sight line, as a fraction from eye (0) to point (1), that lies inside a box. */
interface Span {
  enter: number;
  exit: number;
}

interface Range {
  min: number;
  max: number;
}

interface Sight {
  eye: Vec3;
  delta: Vec3;
  /** The lowest height along the sight line; nothing at or below it can block. */
  low: number;
  /** The sight line's footprint on the map, in x and in y. */
  across: Range;
  along: Range;
}

/** A tile's box as plain ranges: x and y on the map, and its height. */
interface Building {
  across: Range;
  along: Range;
  top: number;
}

const everywhere: Span = { enter: -Infinity, exit: Infinity };

const nowhere: Span = { enter: Infinity, exit: -Infinity };

const cache = new WeakMap<Tile[], Building[]>();

function building(tile: Tile): Building {
  return {
    across: { min: tile.x, max: tile.x + tile.w },
    along: { min: tile.y, max: tile.y + tile.h },
    top: tile.elevation,
  };
}

/** Tallest first, built once per tile list, so a search can stop at the first building too low. */
function buildings(tiles: Tile[]): Building[] {
  const cached = cache.get(tiles);

  if (cached) return cached;
  const sorted = tiles.map(building).sort((a, b) => b.top - a.top);
  cache.set(tiles, sorted);

  return sorted;
}

function within(value: number, range: Range): boolean {
  return value >= range.min && value <= range.max;
}

function between(a: number, b: number): Range {
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

function slab(origin: number, delta: number, range: Range): Span {
  if (delta === 0) return within(origin, range) ? everywhere : nowhere;
  const near = (range.min - origin) / delta;
  const far = (range.max - origin) / delta;

  return { enter: Math.min(near, far), exit: Math.max(near, far) };
}

function crossing({ eye, delta }: Sight, box: Building): Span {
  const x = slab(eye.x, delta.x, box.across);
  const y = slab(eye.y, delta.y, { min: 0, max: box.top });
  const z = slab(eye.z, delta.z, box.along);

  return {
    enter: Math.max(x.enter, y.enter, z.enter, 0),
    exit: Math.min(x.exit, y.exit, z.exit, 1),
  };
}

function overlaps(a: Range, b: Range): boolean {
  return a.min <= b.max && a.max >= b.min;
}

function underSight(sight: Sight, box: Building): boolean {
  return overlaps(sight.across, box.across) && overlaps(sight.along, box.along);
}

function blocks(sight: Sight, box: Building): boolean {
  if (!underSight(sight, box)) return false;
  const span = crossing(sight, box);

  return span.enter <= span.exit && span.enter < 1;
}

function sightLine(eye: Vec3, point: MapPoint): Sight {
  const height = point.elevation ?? 0;

  return {
    eye,
    delta: { x: point.x - eye.x, y: height - eye.y, z: point.y - eye.z },
    low: Math.min(eye.y, height),
    across: between(eye.x, point.x),
    along: between(eye.z, point.y),
  };
}

/**
 * Whether any building stands between the eye and a map point. A building no taller than the sight
 * line's lowest point, such as the point's own building seen from above, never blocks it.
 */
export function hidden(eye: Vec3, tiles: Tile[], point: MapPoint): boolean {
  const sight = sightLine(eye, point);

  const stop = buildings(tiles).find(
    (box) => box.top <= sight.low || blocks(sight, box),
  );

  return stop !== undefined && stop.top > sight.low;
}
