import type { Bounds, CodeFile, Tile } from '../model';
import { folders, type Folder } from './treemap-folder';
import { partition } from './treemap-partition';

// The scene every tile lies inside, in the Canvas's own units; the App scales it to fit.
export const mapExtent: Bounds = { x: 0, y: 0, w: 1000, h: 800 };

const gapLimit = 1.3;

const gapDivisor = 10;

const insetLimit = 1.6;

const insetDivisor = 8;

const sides = 2;

function fileTile(file: CodeFile, bounds: Bounds): Tile {
  const gap = Math.min(gapLimit, bounds.w / gapDivisor, bounds.h / gapDivisor);

  return { ...file, ...bounds, w: bounds.w - gap, h: bounds.h - gap };
}

// A folder's files sit a little inside its bounds, so neighbouring folders read apart.
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

  const children = [...node.children.values()].sort(heaviestFirst);

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

const heaviestFirst = (a: Folder, b: Folder): number => b.weight - a.weight;

// A slice-and-dice treemap: each folder halves its space by weight along its longer side, so area follows lines.
export function layout(files: CodeFile[]): Tile[] {
  const tiles: Tile[] = [];
  split(folders(files).sort(heaviestFirst), mapExtent, tiles);

  return tiles;
}
