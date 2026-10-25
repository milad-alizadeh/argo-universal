import { describe, expect, it } from 'vitest';
import type { Bounds, CodeFile, Tile } from '../model';
import { layout, mapExtent } from './treemap';

function file(path: string, lines: number): CodeFile {
  return { path, lines, branches: 0, touches: 0 };
}

const files = [
  file('apps/server/main.ts', 400),
  file('apps/server/routes.ts', 120),
  file('apps/web/index.tsx', 90),
  file('packages/kit/button.tsx', 300),
  file('packages/kit/text.tsx', 60),
  file('packages/db/schema.ts', 250),
  file('README.md', 40),
];

const area = (tile: Bounds): number => tile.w * tile.h;

// A tile's extent along one axis.
interface Span {
  start: number;
  size: number;
}

const across = (tile: Bounds): Span => ({ start: tile.x, size: tile.w });

const down = (tile: Bounds): Span => ({ start: tile.y, size: tile.h });

const crosses = (a: Span, b: Span): boolean =>
  a.start < b.start + b.size && b.start < a.start + a.size;

const within = (span: Span, outer: Span): boolean =>
  span.start >= outer.start &&
  span.start + span.size <= outer.start + outer.size;

const overlaps = (a: Bounds, b: Bounds): boolean =>
  crosses(across(a), across(b)) && crosses(down(a), down(b));

const inside = (tile: Bounds, outer: Bounds): boolean =>
  within(across(tile), across(outer)) && within(down(tile), down(outer));

const pairs = (tiles: Tile[]): [Tile, Tile][] =>
  tiles.flatMap((a, index) =>
    tiles.slice(index + 1).map((b): [Tile, Tile] => [a, b]),
  );

function hull(tiles: Tile[]): Bounds {
  const x = Math.min(...tiles.map((tile) => tile.x));
  const y = Math.min(...tiles.map((tile) => tile.y));
  const right = Math.max(...tiles.map((tile) => tile.x + tile.w));
  const bottom = Math.max(...tiles.map((tile) => tile.y + tile.h));

  return { x, y, w: right - x, h: bottom - y };
}

const tileOf = (tiles: Tile[], path: string): Tile | undefined =>
  tiles.find((tile) => tile.path === path);

describe('Treemap', () => {
  const tiles = layout(files);

  it('places every file once, inside the map', () => {
    expect(tiles.map((tile) => tile.path).sort()).toEqual(
      files.map((entry) => entry.path).sort(),
    );
    expect(tiles.every((tile) => inside(tile, mapExtent))).toBe(true);
  });

  it('never lets two files overlap', () => {
    expect(pairs(tiles).filter(([a, b]) => overlaps(a, b))).toEqual([]);
  });

  it('gives a file with more lines more room', () => {
    const main = tileOf(tiles, 'apps/server/main.ts');
    const routes = tileOf(tiles, 'apps/server/routes.ts');

    expect(main && routes && area(main) > area(routes)).toBe(true);
  });

  it('keeps the files of one folder together', () => {
    const kit = tiles.filter((tile) => tile.path.startsWith('packages/kit/'));
    const others = tiles.filter((tile) => !kit.includes(tile));
    const folder = hull(kit);

    expect(others.filter((tile) => overlaps(tile, folder))).toEqual([]);
  });

  it('starts with the heaviest top-level folder, as every level does', () => {
    const ordered = layout([file('light/a.ts', 10), file('heavy/b.ts', 500)]);

    expect(ordered.map((tile) => tile.path)).toEqual([
      'heavy/b.ts',
      'light/a.ts',
    ]);
  });

  it('draws nothing for a Project with no files', () => {
    expect(layout([])).toEqual([]);
  });
});
