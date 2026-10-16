import type { Bounds, FileEntry, Tile } from './model';
import { folders, type Folder } from './treemap-folder';
import { partition } from './treemap-partition';

/** The world extent every tile lies inside; renderers, cameras and floors derive from it. */
export const mapExtent: Bounds = { x: -50, y: -40, w: 100, h: 80 };

const gapLimit = 0.13;

const gapDivisor = 10;

const insetLimit = 0.16;

const insetDivisor = 8;

const sides = 2;

const minimumElevation = 0.2;

const elevationScale = 0.7;

function fileTile(file: FileEntry, bounds: Bounds): Tile {
  const gap = Math.min(gapLimit, bounds.w / gapDivisor, bounds.h / gapDivisor);

  return {
    ...file,
    ...bounds,
    w: bounds.w - gap,
    h: bounds.h - gap,
    elevation: minimumElevation + Math.sqrt(file.height) * elevationScale,
  };
}

function folderBounds(bounds: Bounds): Bounds {
  const inset = Math.min(
    insetLimit,
    bounds.w / insetDivisor,
    bounds.h / insetDivisor,
  );

  return {
    x: bounds.x + inset,
    y: bounds.y + inset,
    w: bounds.w - inset * sides,
    h: bounds.h - inset * sides,
  };
}

function single(node: Folder, bounds: Bounds, tiles: Tile[]): void {
  if (node.file) {
    tiles.push(fileTile(node.file, bounds));

    return;
  }

  const children = [...node.children.values()].sort(
    (a, b) => b.weight - a.weight,
  );

  split(children, folderBounds(bounds), tiles);
}

function splitParts(parts: ReturnType<typeof partition>, tiles: Tile[]): void {
  for (const part of parts) split(part.nodes, part.bounds, tiles);
}

function split(nodes: Folder[], bounds: Bounds, tiles: Tile[]): void {
  const first = nodes.at(0);

  if (!first) return;

  if (nodes.length === 1) {
    single(first, bounds, tiles);

    return;
  }

  splitParts(partition(nodes, bounds), tiles);
}

export function layout(files: FileEntry[]): Tile[] {
  const tiles: Tile[] = [];
  split(folders(files), mapExtent, tiles);

  return tiles;
}
