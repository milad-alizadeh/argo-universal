import { describe, expect, it } from 'vitest';
import { tileCorners } from './flat-labels';
import { placeLabels, type LabelScreen } from './map-labels';
import type { Bounds, Tile } from './model';
import { roofCentres } from './three-label-anchors';
import type { CameraPose } from './three-projection';
import type { ScreenPoint } from './viewport';

function tile(id: string, bounds: Bounds, area = 1): Tile {
  const file = { id, path: `src/${id}.ts`, area, height: 1, branches: 0 };

  return { ...file, tone: 'none', ...bounds, elevation: 1 };
}

const open: LabelScreen = {
  size: { width: 1000, height: 1100 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

// One map unit is ten pixels with the map origin at the screen origin.
const tenPixels = tileCorners({ x: 0, y: 0, scale: 10 });

describe('flat labels', () => {
  it('labels a tile only when it is wider than 100 px and taller than 24 px', () => {
    const tiles = [
      tile('narrow', { x: 0, y: 0, w: 10, h: 3 }, 9),
      tile('short', { x: 0, y: 10, w: 20, h: 2.4 }, 8),
      tile('readable', { x: 0, y: 20, w: 11, h: 3 }, 1),
    ];

    expect(placeLabels(tiles, tenPixels, open)).toEqual([
      { id: 'readable', text: 'readable.ts', x: 0, y: 200, maxWidth: 200 },
    ]);
  });
});

function ids(labels: { id: string }[]): string[] {
  return labels.map((label) => label.id);
}

describe('label culling', () => {
  // Anchors 10 px apart overlap; an anchor 300 px lower does not.
  it('keeps the larger file when two labels overlap', () => {
    const tiles = [
      tile('small', { x: 1, y: 1, w: 12, h: 3 }, 5),
      tile('large', { x: 0, y: 0, w: 30, h: 10 }, 300),
      tile('apart', { x: 0, y: 30, w: 11, h: 3 }, 1),
    ];

    expect(ids(placeLabels(tiles, tenPixels, open))).toEqual([
      'large',
      'apart',
    ]);
  });

  // The usable area is x 30–900 and y 55–930. "inside.ts" is about 79 px wide.
  it.each([
    ['top', { x: 400, y: 50 }, { x: 700, y: 60 }],
    ['left', { x: 20, y: 500 }, { x: 330, y: 500 }],
    ['right', { x: 830, y: 500 }, { x: 500, y: 500 }],
    ['bottom', { x: 400, y: 940 }, { x: 700, y: 920 }],
  ])('never anchors a label inside the %s inset', (_, inside, outside) => {
    const screen = {
      ...open,
      insets: { top: 55, right: 100, bottom: 170, left: 30 },
    };

    const tiles = [
      tile('inside', { x: inside.x / 10, y: inside.y / 10, w: 11, h: 3 }, 2),
      tile('outside', { x: outside.x / 10, y: outside.y / 10, w: 11, h: 3 }),
    ];

    expect(ids(placeLabels(tiles, tenPixels, screen))).toEqual(['outside']);
  });

  // Forty readable tiles in one column, 25 px apart, so none overlap.
  it('places at most 32 labels, the largest files first', () => {
    const column = Array.from({ length: 40 }, (_, row) =>
      tile(`row-${row}`, { x: 0, y: row * 2.5, w: 11, h: 2.5 }, row),
    );

    const placed = ids(placeLabels(column, tenPixels, open));

    expect(placed).toHaveLength(32);
    expect(placed).not.toContain('row-7');
    expect(placed).toContain('row-8');
  });
});

type Closeness = ReturnType<typeof expect.closeTo>;

function near(point: Record<string, number>): Record<string, Closeness> {
  return Object.fromEntries(
    Object.entries(point).map(([axis, value]) => [axis, expect.closeTo(value)]),
  );
}

/*
 * A 90° lens on a 400 × 200 view looking down at 45° from 10√2 units: one unit at the target is
 * 100 / (10√2) ≈ 7.07 px.
 */
const above: CameraPose = {
  position: { x: 0, y: 11, z: 10 },
  target: { x: 0, y: 1, z: 0 },
  fov: 90,
  size: { width: 400, height: 200 },
};

const viewSize = { ...open, size: above.size };

function positions(roof: Tile, pose: CameraPose): ScreenPoint[] {
  return placeLabels([roof], roofCentres([roof], pose), viewSize).map(
    ({ x, y }) => ({ x, y }),
  );
}

describe('3D labels', () => {
  const roof = tile('roof', { x: -5, y: -5, w: 10, h: 10 });

  it('follows the camera pose to the roof centre', () => {
    const shifted = {
      ...above,
      position: { x: 4, y: 11, z: 10 },
      target: { x: 4, y: 1, z: 0 },
    };

    expect(positions(roof, above)).toEqual([near({ x: 200, y: 100 })]);
    // Four units left of the target: 4 × 100 / (10√2) = 28.28 px.
    expect(positions(roof, shifted)).toEqual([near({ x: 171.716, y: 100 })]);
  });

  /*
   * Looking down at 45° from (0, 20, 20). The sight line to the back roof centre (0, 2, 0) passes
   * z 8–12 at heights 12.8–9.2, so a 15-unit building there hides it and a 1-unit one does not.
   */
  it.each([
    ['a taller, nearer building', 15, ['front']],
    ['a lower, nearer building', 1, ['back', 'front']],
  ])('labels a roof behind %s only when it can be seen', (_, height, seen) => {
    const pose = {
      ...above,
      position: { x: 0, y: 20, z: 20 },
      target: { x: 0, y: 0, z: 0 },
      size: { width: 400, height: 400 },
    };

    const tiles = [
      { ...tile('back', { x: -5, y: -5, w: 10, h: 10 }, 100), elevation: 2 },
      { ...tile('front', { x: -3, y: 8, w: 6, h: 4 }, 10), elevation: height },
    ];

    const screen = { ...open, size: pose.size };

    expect(ids(placeLabels(tiles, roofCentres(tiles, pose), screen))).toEqual(
      seen,
    );
  });
});
